import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchResearchSamples,
  importTrainingDatasetPackage,
  pollPipelineRun,
  previewTrainingDatasetPackage,
  runUserProjection,
} from '../researchLab'
import { request } from '../http'

vi.mock('../http', () => ({ request: vi.fn() }))

describe('researchLab service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends supported filters to the unified research endpoint', async () => {
    request.mockResolvedValue({ items: [], total: 0 })

    await fetchResearchSamples({
      page: 2,
      pageSize: 100,
      stockCode: '600519',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-14',
      status: 'TRADABLE',
      qualityStatus: 'READY',
    })

    expect(request).toHaveBeenCalledWith(
      '/api/ai/research-lab/samples?page=2&pageSize=100&dateFrom=2026-07-01&dateTo=2026-07-14&stockCode=600519&status=TRADABLE&qualityStatus=READY',
    )
  })

  it('never forwards a client-selected user id for user projection', async () => {
    request.mockResolvedValue({ pipelineRunId: 99, status: 'PENDING' })

    await runUserProjection({ tradeDate: '2026-07-14', userId: 999 })

    expect(request).toHaveBeenCalledWith('/api/ai/research-lab/actions/run-user-projection', {
      method: 'POST',
      body: { tradeDate: '2026-07-14' },
    })
  })

  it('stops polling when a training run is blocked by insufficient data', async () => {
    request
      .mockResolvedValueOnce({ record: { fields: { status: 'RUNNING' } } })
      .mockResolvedValueOnce({
        record: {
          fields: {
            status: 'INSUFFICIENT_DATA',
            errorMessage: '训练数据尚未就绪',
          },
        },
      })

    const result = await pollPipelineRun(88, { interval: 0, maxAttempts: 3 })

    expect(request).toHaveBeenCalledTimes(2)
    expect(result.record.fields.status).toBe('INSUFFICIENT_DATA')
  })

  it('uploads training dataset packages as multipart data for preview and controlled import', async () => {
    request.mockResolvedValue({ compatible: true, rejectedRows: 0 })
    const file = new File(['dataset'], 'maogou-training-dataset.tar.gz', { type: 'application/gzip' })

    await previewTrainingDatasetPackage(file)
    expect(request).toHaveBeenLastCalledWith(
      '/api/ai/research-lab/actions/preview-training-dataset-import',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    )
    expect(request.mock.calls.at(-1)[1].body.get('package')).toBe(file)

    await importTrainingDatasetPackage(file)
    expect(request).toHaveBeenLastCalledWith(
      '/api/ai/research-lab/actions/import-training-dataset',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    )
  })

  it('contains no retired AI research API paths anywhere in frontend source', () => {
    const sourceRoot = path.resolve(process.cwd(), 'src')
    const banned = [
      ['/api/ai', '/learning'].join(''),
      ['/api/ai', '/evolution'].join(''),
      ['/api/ai', '/daily-insight'].join(''),
    ]
    const files = walk(sourceRoot).filter((file) => /\.(?:js|vue)$/.test(file))

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8')
      for (const value of banned) {
        expect(content, `${path.relative(sourceRoot, file)} contains ${value}`).not.toContain(value)
      }
    }
  })
})

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(target) : [target]
  })
}

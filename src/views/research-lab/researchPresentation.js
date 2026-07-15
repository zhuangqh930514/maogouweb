import { localizeStatusText, statusLabel } from '../../utils/statusLabels'

const FIELD_LABELS = Object.freeze({
  id: '记录 ID',
  action: '建议动作',
  actionBucket: '动作分组',
  actionEffective: '动作有效',
  actualDirection: '实际方向',
  algorithm: '算法',
  alpha: '超额收益',
  artifactChecksum: '产物校验和',
  artifactUri: '产物地址',
  asOfTime: '信息截至时间',
  assessmentEventKey: '评估事件键',
  avgAdverseReturn: '平均不利波动',
  avgExcessReturn: '平均超额收益',
  benchmarkReturn: '基准收益',
  calibratedConfidence: '校准置信度',
  calendarVersion: '交易日历版本',
  calmarRatio: '卡玛比率',
  championExcessReturn: '正式策略超额收益',
  championMaxDrawdown: '正式策略最大回撤',
  championReleaseId: '正式策略 ID',
  challengerExcessReturn: '候选策略超额收益',
  challengerMaxDrawdown: '候选策略最大回撤',
  challengerReleaseId: '候选策略 ID',
  completedAt: '完成时间',
  confidenceLevel: '置信等级',
  consecutiveFailureCount: '连续失败次数',
  createdAt: '创建时间',
  currentStep: '当前步骤',
  dataBatchId: '数据批次 ID',
  dataQualityScore: '数据质量分',
  datasetKey: '数据集键',
  decisionStatus: '治理结论',
  defaultWeight: '基线权重',
  direction: '因子方向',
  directionCorrect: '方向正确',
  driftStatus: '漂移状态',
  embargoTradingDays: '隔离交易日',
  enabled: '启用状态',
  endTradeDate: '结束交易日',
  entryPrice: '入场价格',
  entryTradeDate: '入场交易日',
  errorMessage: '错误信息',
  evaluatedAt: '评估时间',
  evaluationScore: '评估分',
  evaluationStatus: '评估状态',
  eventKey: '事件键',
  eventType: '事件类型',
  excessReturn: '超额收益',
  executionReason: '成交说明',
  executionStatus: '成交状态',
  exitPrice: '退出价格',
  exitTradeDate: '退出交易日',
  expectedExcessReturn: '预期超额收益',
  expectedReturn: '预期收益',
  factorCode: '因子编码',
  factorDefinitionId: '因子定义 ID',
  factorGroup: '因子组',
  factorName: '因子名称',
  factorVersion: '因子版本',
  failedCount: '失败数',
  featureDriftScore: '特征漂移分',
  featureVersion: '特征版本',
  finalNav: '期末净值',
  finishedAt: '结束时间',
  formulaDesc: '计算说明',
  grossReturn: '毛收益',
  horizonDays: '预测周期',
  horizonTradingDays: '预测周期',
  idempotencyKey: '幂等键',
  inferenceMode: '推理方式',
  inputCount: '输入数',
  inputFingerprint: '输入指纹',
  itemCount: '记录数',
  labelAvailableAt: '标签可用时间',
  labelStatus: '标签状态',
  labelVersion: '标签版本',
  lastAttemptAt: '最近请求时间',
  lastErrorMessage: '最近错误',
  lastSuccessAt: '最近成功时间',
  lineageFingerprint: '血缘指纹',
  marketRegime: '市场环境',
  maxAdverseReturn: '最大不利波动',
  maxDrawdown: '最大回撤',
  maxFavorableReturn: '最大有利波动',
  modelFamily: '模型族',
  modelKey: '模型键',
  modelType: '模型类型',
  modelVersionId: '模型版本 ID',
  maturedAt: '成熟时间',
  netReturn: '净收益',
  outputCount: '输出数',
  outputFingerprint: '输出指纹',
  pipelineRunId: '流水线 ID',
  pipelineType: '流水线类型',
  policyVersion: '治理规则版本',
  predictedAt: '预测时间',
  predictedReturnError: '收益预测误差',
  predictionId: '预测 ID',
  probabilityDown: '下跌概率',
  probabilityError: '概率误差',
  probabilityUp: '上涨概率',
  processedCount: '处理数',
  providerCode: '数据提供方',
  psiScore: 'PSI 漂移分',
  purgeTradingDays: '清洗交易日',
  qualityScore: '质量分',
  qualityStatus: '质量状态',
  rankIc: 'RankIC',
  rankNo: '排名',
  reason: '原因',
  releaseRole: '策略角色',
  requiredFieldsJson: '必需输入',
  researchUniverseId: '研究股票池 ID',
  retryCount: '重试次数',
  riskScore: '风险分',
  rowCount: '样本行数',
  runKey: '运行键',
  sampleCount: '样本数',
  sampleId: '样本 ID',
  sampleLabelId: '真实标签 ID',
  samplePhase: '样本时点',
  score: '预测分',
  sectorCode: '行业编码',
  sectorName: '所属行业',
  sharpeRatio: '夏普比率',
  sourceFingerprint: '来源指纹',
  sourceStatus: '数据源状态',
  stabilityScore: '稳定性分',
  startedAt: '开始时间',
  startTradeDate: '开始交易日',
  status: '状态',
  stockCode: '股票代码',
  stockName: '股票名称',
  strategyReleaseId: '策略版本 ID',
  successCount: '成功数',
  successRate: '命中率',
  targetDirection: '目标方向',
  title: '名称',
  totalReturn: '总收益',
  tradeCount: '交易数',
  tradeDate: '交易日',
  tradableStatus: '可交易状态',
  trainerVersion: '训练器版本',
  trainingDatasetId: '训练数据集 ID',
  turnoverRate: '换手率',
  updatedAt: '更新时间',
  versionNo: '版本号',
  verifiedAt: '验证时间',
  wilsonLowerBound: '置信下界',
  windowEndDate: '窗口结束日',
  windowStartDate: '窗口开始日',
  windowType: '统计窗口',
})

const STATUS_FIELDS = new Set([
  'action',
  'actionBucket',
  'actualDirection',
  'actorType',
  'confidenceLevel',
  'decisionStatus',
  'direction',
  'driftStatus',
  'evaluationStatus',
  'eventType',
  'executionStatus',
  'inferenceMode',
  'labelStatus',
  'marketRegime',
  'pipelineType',
  'qualityStatus',
  'releaseRole',
  'samplePhase',
  'sourceStatus',
  'status',
  'targetDirection',
  'tradableStatus',
])

const RATIO_FIELDS = new Set([
  'actionAgreementRate',
  'alpha',
  'annualizedReturn',
  'avgAdverseReturn',
  'avgExcessReturn',
  'benchmarkReturn',
  'calibratedConfidence',
  'championExcessReturn',
  'championMaxDrawdown',
  'challengerExcessReturn',
  'challengerMaxDrawdown',
  'coverageRate',
  'excessReturn',
  'expectedExcessReturn',
  'expectedReturn',
  'grossReturn',
  'maxAdverseReturn',
  'maxDrawdown',
  'maxFavorableReturn',
  'netReturn',
  'probabilityDown',
  'probabilityError',
  'probabilityUp',
  'rankIc',
  'successRate',
  'totalReturn',
  'turnoverRate',
  'wilsonLowerBound',
])

const BOOLEAN_FIELDS = new Set(['actionEffective', 'directionCorrect', 'enabled'])

export function researchFieldLabel(key) {
  return FIELD_LABELS[key] || key.replace(/([A-Z])/g, ' $1').trim()
}

export function formatResearchValue(key, value) {
  if (value === null || value === undefined || value === '') return '-'
  if (BOOLEAN_FIELDS.has(key)) return Number(value) === 1 || value === true ? '是' : '否'
  if (key === 'confidenceLevel') return confidenceLabel(value)
  if (STATUS_FIELDS.has(key)) return statusLabel(value)
  if (RATIO_FIELDS.has(key)) return formatRatio(value)
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  if (/At$|Time$/.test(key)) return String(value).replace('T', ' ').slice(0, 19)
  return localizeStatusText(String(value))
}

export function confidenceLabel(value) {
  return { HIGH: '高置信', MEDIUM: '中置信', LOW: '低置信' }[String(value || '').toUpperCase()]
    || statusLabel(value)
}

export function formatRatio(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return `${(number * 100).toFixed(2)}%`
}

export function statusTagType(value) {
  const status = String(value || '').toUpperCase()
  if (['SUCCESS', 'READY', 'ACTIVE', 'MATURED', 'TRADABLE', 'HEALTHY', 'PROMOTED', 'VALIDATED'].includes(status)) return 'success'
  if (['FAILED', 'CRITICAL', 'UNAVAILABLE', 'REJECTED', 'ROLLED_BACK', 'HIGH', 'UNFILLED'].includes(status)) return 'danger'
  if (['PARTIAL_SUCCESS', 'PARTIAL_READY', 'WAITING_SOURCE', 'WARNING', 'STALE', 'INSUFFICIENT_DATA', 'SHADOW'].includes(status)) return 'warning'
  return 'info'
}

export function detailJson(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return localizeStatusText(value)
    }
  }
  return JSON.stringify(value, null, 2)
}

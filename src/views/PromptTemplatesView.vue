<template>
  <div class="page">
    <section class="surface">
      <div class="surface-header">
        <div class="prompt-header-copy">
          <h2 class="surface-title">提示词管理</h2>
        </div>
        <el-button type="primary" :icon="Plus" @click="startCreate">新增提示词</el-button>
      </div>

      <div v-loading="loading" class="prompt-layout">
        <div class="prompt-list">
          <el-table
            :data="templates"
            height="100%"
            highlight-current-row
            :current-row-key="form.id"
            row-key="id"
            empty-text="暂无提示词模板"
            @row-click="selectTemplate"
          >
            <el-table-column prop="title" label="提示词标题" min-width="180" />
            <el-table-column label="更新时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.updatedAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="96" align="center">
              <template #default="{ row }">
                <el-button type="danger" link :icon="Delete" @click.stop="removeTemplate(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="prompt-editor">
          <el-form label-position="top">
            <el-form-item label="提示词标题">
              <el-input v-model="form.title" maxlength="128" show-word-limit placeholder="请输入提示词标题" />
            </el-form-item>
            <el-form-item label="提示词内容">
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="14"
                placeholder="请输入用于 AI 分析的 Prompt 模板"
              />
            </el-form-item>
            <div class="form-actions">
              <el-button @click="resetForm">清空</el-button>
              <el-button type="primary" :icon="Check" :loading="saving" @click="saveTemplate">
                {{ form.id ? '保存修改' : '创建提示词' }}
              </el-button>
            </div>
          </el-form>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Delete, Plus } from '@element-plus/icons-vue'
import {
  createPromptTemplate,
  deletePromptTemplate,
  fetchPromptTemplates,
  updatePromptTemplate,
} from '../services/settings'

const templates = ref([])
const loading = ref(false)
const saving = ref(false)
const form = reactive({
  id: null,
  title: '',
  content: '',
})

async function loadTemplates(selectedId) {
  loading.value = true
  try {
    templates.value = await fetchPromptTemplates()
    const selected = templates.value.find((item) => item.id === selectedId) || templates.value[0]
    if (selected) {
      selectTemplate(selected)
    } else {
      resetForm()
    }
  } catch (error) {
    ElMessage.error(error.message || '提示词列表获取失败')
  } finally {
    loading.value = false
  }
}

function selectTemplate(row) {
  Object.assign(form, {
    id: row.id,
    title: row.title,
    content: row.content,
  })
}

function startCreate() {
  Object.assign(form, {
    id: null,
    title: '',
    content: '',
  })
}

function resetForm() {
  startCreate()
}

async function saveTemplate() {
  const title = form.title.trim()
  const content = form.content.trim()
  if (!title || !content) {
    ElMessage.warning('请填写提示词标题和内容')
    return
  }
  saving.value = true
  try {
    const payload = { title, content }
    const saved = form.id
      ? await updatePromptTemplate(form.id, payload)
      : await createPromptTemplate(payload)
    ElMessage.success(form.id ? '提示词已更新' : '提示词已创建')
    await loadTemplates(saved.id)
  } catch (error) {
    ElMessage.error(error.message || '提示词保存失败')
  } finally {
    saving.value = false
  }
}

async function removeTemplate(row) {
  try {
    await ElMessageBox.confirm(`确认删除“${row.title}”？`, '删除提示词', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await deletePromptTemplate(row.id)
    ElMessage.success('提示词已删除')
    await loadTemplates(form.id === row.id ? null : form.id)
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error.message || '提示词删除失败')
    }
  }
}

function formatTime(value) {
  if (!value) {
    return '-'
  }
  return String(value).replace('T', ' ').slice(0, 19)
}

onMounted(() => loadTemplates())
</script>

<style scoped>
.prompt-header-copy {
  min-height: 52px;
  display: flex;
  align-items: flex-start;
}

.prompt-layout {
  display: grid;
  grid-template-columns: minmax(360px, 0.9fr) minmax(420px, 1.1fr);
  gap: 18px;
  min-height: 560px;
}

.prompt-list,
.prompt-editor {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  padding: 16px;
}

.prompt-list {
  min-height: 560px;
}

.prompt-editor {
  display: flex;
  flex-direction: column;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 960px) {
  .prompt-layout {
    grid-template-columns: 1fr;
  }
}
</style>

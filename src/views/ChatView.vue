<template>
  <div class="chat-page">
    <aside class="chat-rail">
      <div class="rail-header">
        <div>
          <h2>猫狗畅聊</h2>
          <p>个人投研对话</p>
        </div>
        <el-button type="primary" :icon="Plus" @click="startNewSession">新会话</el-button>
      </div>

      <el-scrollbar class="session-scroll">
        <button
          v-for="session in sessions"
          :key="session.id"
          class="session-item"
          :class="{ active: session.id === activeSessionId }"
          @click="selectSession(session.id)"
        >
          <span>{{ session.title || '新会话' }}</span>
          <small>{{ formatShortTime(session.updatedAt || session.createdAt) }}</small>
        </button>
      </el-scrollbar>
    </aside>

    <section class="chat-workspace">
      <header class="chat-header">
        <div>
          <h2>{{ activeSession?.title || '新会话' }}</h2>
          <div class="chat-meta">
            <el-tag class="tag-blue" effect="plain">{{ activeSession?.modelName || '模型待配置' }}</el-tag>
            <el-tag class="tag-green" effect="plain">当前账号独立记忆</el-tag>
          </div>
        </div>
        <div class="chat-actions">
          <el-button :icon="Memo" @click="openMemory">我的记忆</el-button>
          <el-button :icon="Delete" :disabled="!activeSessionId" @click="removeCurrentSession">删除会话</el-button>
        </div>
      </header>

      <div ref="messageListRef" v-loading="loadingMessages" class="message-list">
        <div v-if="!messages.length" class="welcome">
          <img src="/maogou-logo.png" alt="猫狗智投" />
          <h3>今天想聊点什么？</h3>
          <div class="prompt-grid">
            <button v-for="prompt in quickPrompts" :key="prompt" @click="fillPrompt(prompt)">
              {{ prompt }}
            </button>
          </div>
        </div>

        <div v-for="message in messages" :key="message.id" class="message-row" :class="message.role">
          <div class="message-avatar">
            <img v-if="message.role === 'assistant'" src="/maogou-logo.png" alt="猫狗智投" />
            <el-icon v-else><UserFilled /></el-icon>
          </div>
          <div class="message-content">
            <div class="message-bubble" :class="{ failed: message.status === 'FAILED' }">
              <div v-if="message.loading" class="model-loading">
                <img src="/maogou-logo.png" alt="猫狗智投" />
                <span class="loading-dots">
                  <i></i>
                  <i></i>
                  <i></i>
                </span>
                <span>猫狗投研正在翻资料...</span>
              </div>
              <span v-else>{{ message.content }}</span>
            </div>
            <small>{{ formatFullTime(message.createdAt) }}</small>
          </div>
        </div>
      </div>

      <footer class="composer">
        <el-input
          v-model="draft"
          type="textarea"
          :rows="3"
          maxlength="8000"
          show-word-limit
          resize="none"
          placeholder="问问猫狗畅聊，例如：记住我的风险偏好偏稳健，帮我分析明天自选股该看哪些信号。"
          @keydown.enter.exact.prevent="sendMessage"
        />
        <el-button type="primary" :icon="Promotion" :loading="sending" @click="sendMessage">发送</el-button>
      </footer>
    </section>

    <el-drawer v-model="memoryDrawerVisible" title="我的聊天记忆" size="420px">
      <div class="memory-panel">
        <el-input
          v-model="memoryDraft"
          type="textarea"
          :rows="12"
          maxlength="4000"
          show-word-limit
          resize="none"
          placeholder="这里保存当前账号的长期偏好、关注方向和投研习惯。"
        />
        <div class="memory-footer">
          <span>最近互动：{{ formatFullTime(memory?.lastInteractionAt) || '暂无' }}</span>
          <el-button type="primary" :loading="savingMemory" @click="saveMemory">保存记忆</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Memo, Plus, Promotion, UserFilled } from '@element-plus/icons-vue'
import {
  createChatSession,
  deleteChatSession,
  fetchChatMemory,
  fetchChatSession,
  fetchChatSessions,
  sendChatMessage,
  updateChatMemory,
} from '../services/chat'

const sessions = ref([])
const activeSessionId = ref(null)
const messages = ref([])
const memory = ref(null)
const draft = ref('')
const memoryDraft = ref('')
const memoryDrawerVisible = ref(false)
const loadingMessages = ref(false)
const sending = ref(false)
const savingMemory = ref(false)
const messageListRef = ref(null)

const quickPrompts = [
  '帮我复盘今天自选股的主要风险',
  '记住：我的风险偏好偏稳健，单只股票不想重仓',
  '如果我接入 DeepSeek，模型配置要注意什么？',
  '用技术面、资金面、风险点三段分析一只股票',
]

const activeSession = computed(() => sessions.value.find((item) => item.id === activeSessionId.value))

onMounted(async () => {
  await loadSessions()
  await loadMemory()
  if (sessions.value.length) {
    await selectSession(sessions.value[0].id)
  } else {
    await startNewSession()
  }
})

async function loadSessions() {
  try {
    sessions.value = await fetchChatSessions()
  } catch (error) {
    ElMessage.error(error.message || '会话列表加载失败')
  }
}

async function loadMemory() {
  try {
    memory.value = await fetchChatMemory()
  } catch {
    memory.value = { memorySummary: '', lastInteractionAt: null }
  }
}

async function startNewSession() {
  try {
    const session = await createChatSession('新会话')
    sessions.value = [session, ...sessions.value.filter((item) => item.id !== session.id)]
    activeSessionId.value = session.id
    messages.value = []
    await scrollToBottom()
  } catch (error) {
    ElMessage.error(error.message || '新建会话失败')
  }
}

async function selectSession(sessionId) {
  if (!sessionId || sessionId === activeSessionId.value) {
    return
  }
  activeSessionId.value = sessionId
  loadingMessages.value = true
  try {
    const detail = await fetchChatSession(sessionId)
    messages.value = detail.messages || []
    memory.value = detail.memory || memory.value
    const sessionIndex = sessions.value.findIndex((item) => item.id === sessionId)
    if (sessionIndex >= 0 && detail.session) {
      sessions.value.splice(sessionIndex, 1, detail.session)
    }
    await scrollToBottom()
  } catch (error) {
    ElMessage.error(error.message || '会话加载失败')
  } finally {
    loadingMessages.value = false
  }
}

async function sendMessage() {
  const content = draft.value.trim()
  if (!content || sending.value) {
    return
  }
  if (!activeSessionId.value) {
    await startNewSession()
    if (!activeSessionId.value) {
      return
    }
  }
  draft.value = ''
  sending.value = true
  const pendingKey = `pending-${Date.now()}`
  messages.value.push({
    id: `${pendingKey}-user`,
    role: 'user',
    content,
    status: 'SUCCESS',
    createdAt: new Date().toISOString(),
  })
  messages.value.push({
    id: `${pendingKey}-assistant`,
    role: 'assistant',
    content: '正在调用大模型...',
    status: 'PENDING',
    loading: true,
    createdAt: new Date().toISOString(),
  })
  await scrollToBottom()
  try {
    const response = await sendChatMessage(activeSessionId.value, content)
    const start = messages.value.findIndex((item) => item.id === `${pendingKey}-user`)
    if (start >= 0) {
      messages.value.splice(start, 2, response.userMessage, response.assistantMessage)
    }
    memory.value = response.memory
    upsertSession(response.session)
    await scrollToBottom()
  } catch (error) {
    const pending = messages.value.find((item) => item.id === `${pendingKey}-assistant`)
    if (pending) {
      pending.loading = false
      pending.status = 'FAILED'
      pending.content = error.message || '发送失败'
    }
  } finally {
    sending.value = false
  }
}

async function removeCurrentSession() {
  if (!activeSessionId.value) {
    return
  }
  try {
    await ElMessageBox.confirm('确认删除当前会话？聊天记忆不会被删除。', '删除会话', { type: 'warning' })
    await deleteChatSession(activeSessionId.value)
    sessions.value = sessions.value.filter((item) => item.id !== activeSessionId.value)
    activeSessionId.value = null
    messages.value = []
    if (sessions.value.length) {
      await selectSession(sessions.value[0].id)
    } else {
      await startNewSession()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除会话失败')
    }
  }
}

function fillPrompt(prompt) {
  draft.value = prompt
}

function openMemory() {
  memoryDraft.value = memory.value?.memorySummary || ''
  memoryDrawerVisible.value = true
}

async function saveMemory() {
  savingMemory.value = true
  try {
    memory.value = await updateChatMemory(memoryDraft.value)
    ElMessage.success('记忆已保存')
    memoryDrawerVisible.value = false
  } catch (error) {
    ElMessage.error(error.message || '保存记忆失败')
  } finally {
    savingMemory.value = false
  }
}

function upsertSession(session) {
  if (!session) {
    return
  }
  const index = sessions.value.findIndex((item) => item.id === session.id)
  if (index >= 0) {
    sessions.value.splice(index, 1)
  }
  sessions.value.unshift(session)
}

async function scrollToBottom() {
  await nextTick()
  const element = messageListRef.value
  if (element) {
    element.scrollTop = element.scrollHeight
  }
}

function formatShortTime(value) {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  }
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatFullTime(value) {
  if (!value) {
    return ''
  }
  const date = new Date(value)
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function pad(value) {
  return String(value).padStart(2, '0')
}
</script>

<style scoped>
.chat-page {
  display: grid;
  grid-template-columns: 292px minmax(0, 1fr);
  min-height: calc(100vh - 140px);
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 16px 32px -28px rgba(15, 23, 42, 0.28);
}

.chat-rail {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid #e5e7eb;
  background: #f8fafc;
}

.rail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px;
}

.rail-header h2,
.chat-header h2 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  font-weight: 800;
  line-height: 28px;
}

.rail-header p {
  margin: 2px 0 0;
  color: #64748b;
  font-size: 12px;
}

.session-scroll {
  flex: 1;
  min-height: 0;
  padding: 0 12px 16px;
}

.session-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  padding: 12px;
  color: #334155;
  text-align: left;
  cursor: pointer;
}

.session-item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 700;
}

.session-item small {
  color: #94a3b8;
  font-size: 12px;
}

.session-item:hover,
.session-item.active {
  background: #eaf1ff;
  color: #1d4ed8;
}

.chat-workspace {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: rgba(255, 255, 255, 0.92);
}

.chat-meta,
.chat-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.chat-actions {
  margin-top: 0;
}

.message-list {
  flex: 1;
  min-height: 420px;
  max-height: calc(100vh - 300px);
  overflow-y: auto;
  padding: 28px 8% 32px;
}

.welcome {
  display: flex;
  min-height: 360px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  text-align: center;
}

.welcome img {
  width: 88px;
  height: 88px;
  border: 1px solid #dbeafe;
  border-radius: 20px;
  background: #fff;
  object-fit: contain;
  box-shadow: 0 20px 38px -28px rgba(37, 99, 235, 0.7);
}

.welcome h3 {
  margin: 0;
  color: #111827;
  font-size: 28px;
  line-height: 38px;
}

.prompt-grid {
  width: min(680px, 100%);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.prompt-grid button {
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  padding: 14px 16px;
  color: #334155;
  text-align: left;
  font-size: 14px;
  line-height: 22px;
  cursor: pointer;
}

.prompt-grid button:hover {
  border-color: #93c5fd;
  color: #1d4ed8;
  background: #eff6ff;
}

.message-row {
  display: flex;
  gap: 12px;
  margin-bottom: 22px;
}

.message-row.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #eaf1ff;
  color: #1d4ed8;
  overflow: hidden;
}

.message-avatar img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #fff;
}

.message-content {
  max-width: min(760px, 78%);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.message-row.user .message-content {
  align-items: flex-end;
}

.message-bubble {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 13px 15px;
  color: #111827;
  font-size: 15px;
  line-height: 25px;
  white-space: pre-wrap;
  box-shadow: 0 12px 24px -24px rgba(15, 23, 42, 0.3);
}

.message-row.user .message-bubble {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

.message-bubble.failed {
  border-color: #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

.message-content small {
  color: #94a3b8;
  font-size: 12px;
}

.model-loading {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  white-space: nowrap;
}

.model-loading img {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  object-fit: contain;
  animation: loader-bounce 1.4s ease-in-out infinite;
}

.loading-dots {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.loading-dots i {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #2563eb;
  animation: dot-pulse 1.2s ease-in-out infinite;
}

.loading-dots i:nth-child(2) {
  animation-delay: 0.15s;
}

.loading-dots i:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes loader-bounce {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-3px) rotate(4deg);
  }
}

@keyframes dot-pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.75);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

.composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
  padding: 18px 24px 22px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}

.composer :deep(.el-textarea__inner) {
  min-height: 82px !important;
  padding: 14px 16px;
}

.composer .el-button {
  height: 44px;
  padding: 0 22px;
}

.memory-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.memory-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #64748b;
  font-size: 13px;
}
</style>

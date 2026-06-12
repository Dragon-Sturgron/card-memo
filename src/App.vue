<script setup>
import { computed, onMounted, ref } from 'vue'
import MemoCard from './components/MemoCard.vue'
import MemoEditor from './components/MemoEditor.vue'
import Toolbar from './components/Toolbar.vue'
import EmptyState from './components/EmptyState.vue'
import CloudPanel from './components/CloudPanel.vue'
import { deleteMemo, getAllMemos, replaceMemos, saveMemo } from './db'
import { fetchCloudMemos, loadCloudToken, pushCloudMemos, saveCloudToken } from './cloudApi'
import { createMemoDraft, downloadJson, readJsonFile } from './utils'

const memos = ref([])
const query = ref('')
const activeTag = ref('全部')
const viewMode = ref('active')
const editorOpen = ref(false)
const editingMemo = ref(null)
const statusMessage = ref('')
const cloudToken = ref('')
const cloudLoading = ref(false)
const cloudStatus = ref('')

onMounted(async () => {
  cloudToken.value = loadCloudToken()
  await loadMemos()
})

async function loadMemos() {
  const data = await getAllMemos()
  memos.value = sortMemos(data)
}

function sortMemos(list) {
  return [...list].sort((a, b) => {
    if (Number(b.pinned) !== Number(a.pinned)) return Number(b.pinned) - Number(a.pinned)
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
  })
}

const visibleMemos = computed(() => {
  const keyword = query.value.trim().toLowerCase()

  return memos.value.filter((memo) => {
    const matchMode = viewMode.value === 'archived' ? memo.archived : !memo.archived
    const matchTag = activeTag.value === '全部' || memo.tags?.includes(activeTag.value)
    const haystack = [memo.title, memo.content, ...(memo.tags || [])].join(' ').toLowerCase()
    const matchKeyword = !keyword || haystack.includes(keyword)
    return matchMode && matchTag && matchKeyword
  })
})

const activeMemos = computed(() => memos.value.filter((memo) => !memo.archived))

const tagOptions = computed(() => {
  const counter = new Map()
  for (const memo of memos.value) {
    if (viewMode.value === 'active' && memo.archived) continue
    if (viewMode.value === 'archived' && !memo.archived) continue
    for (const tag of memo.tags || []) {
      counter.set(tag, (counter.get(tag) || 0) + 1)
    }
  }

  return [...counter.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'))
})

function openNewMemo() {
  editingMemo.value = createMemoDraft()
  editorOpen.value = true
}

function openEditMemo(memo) {
  editingMemo.value = structuredClone(memo)
  editorOpen.value = true
}

async function handleSave(memo) {
  const now = new Date().toISOString()
  const normalized = normalizeMemo({
    ...memo,
    createdAt: memo.createdAt || now,
    updatedAt: now
  })

  await saveMemo(normalized)
  await loadMemos()
  editorOpen.value = false
  editingMemo.value = null
  flash('卡片已保存')
}

async function togglePin(memo) {
  await saveMemo({ ...memo, pinned: !memo.pinned, updatedAt: new Date().toISOString() })
  await loadMemos()
}

async function toggleArchive(memo) {
  await saveMemo({ ...memo, archived: !memo.archived, updatedAt: new Date().toISOString() })
  await loadMemos()
  flash(memo.archived ? '卡片已恢复' : '卡片已归档')
}

async function removeMemo(memo) {
  const ok = window.confirm(`确定删除${memo.title ? `「${memo.title}」` : '这张卡片'}吗？删除后只能通过导出的备份恢复。`)
  if (!ok) return

  await deleteMemo(memo.id)
  await loadMemos()
  flash('卡片已删除')
}

function handleExport() {
  const payload = {
    app: 'card-memo',
    exportedAt: new Date().toISOString(),
    memos: memos.value
  }
  downloadJson(`card-memo-backup-${new Date().toISOString().slice(0, 10)}.json`, payload)
}

async function handleImport(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  try {
    const data = await readJsonFile(file)
    const importedMemos = Array.isArray(data) ? data : data.memos
    if (!Array.isArray(importedMemos)) throw new Error('Invalid backup file')

    const cleaned = cleanMemoList(importedMemos)
    if (!cleaned.length) throw new Error('No valid memos')
    const ok = window.confirm(`将用导入文件覆盖当前 ${memos.value.length} 张卡片，确定继续吗？`)
    if (!ok) return

    await replaceMemos(cleaned)
    await loadMemos()
    activeTag.value = '全部'
    viewMode.value = 'active'
    flash(`已导入 ${cleaned.length} 张卡片`)
  } catch (error) {
    console.error(error)
    window.alert('导入失败，请确认文件是 Card Memo 导出的 JSON。')
  }
}

function handleSaveCloudToken() {
  saveCloudToken(cloudToken.value)
  cloudStatus.value = cloudToken.value.trim() ? '令牌已保存到当前浏览器。' : '已清空本地令牌。'
}

async function pullFromCloud() {
  const ok = window.confirm('从云端拉取会覆盖当前浏览器里的本地卡片。建议先导出 JSON 备份，确定继续吗？')
  if (!ok) return

  cloudLoading.value = true
  cloudStatus.value = '正在从云端拉取...'

  try {
    const result = await fetchCloudMemos(cloudToken.value.trim())
    const cloudMemos = cleanMemoList(result?.data?.memos || [])
    await replaceMemos(cloudMemos)
    await loadMemos()
    activeTag.value = '全部'
    viewMode.value = 'active'
    cloudStatus.value = `已从云端拉取 ${cloudMemos.length} 张卡片。`
    flash('云端数据已同步到本地')
  } catch (error) {
    console.error(error)
    cloudStatus.value = `拉取失败：${error.message}`
  } finally {
    cloudLoading.value = false
  }
}

async function pushToCloud() {
  const ok = window.confirm(`将当前浏览器里的 ${memos.value.length} 张卡片覆盖保存到云端 KV，确定继续吗？`)
  if (!ok) return

  cloudLoading.value = true
  cloudStatus.value = '正在推送到云端...'

  try {
    const result = await pushCloudMemos(memos.value, cloudToken.value.trim())
    cloudStatus.value = `已推送 ${result?.data?.count ?? memos.value.length} 张卡片到云端。`
    flash('本地数据已推送到云端')
  } catch (error) {
    console.error(error)
    cloudStatus.value = `推送失败：${error.message}`
  } finally {
    cloudLoading.value = false
  }
}

function cleanMemoList(input) {
  return input
    .filter((item) => item && item.id && (item.title || item.content))
    .map((item) => normalizeMemo(item))
}

function normalizeMemo(memo) {
  const now = new Date().toISOString()
  return {
    ...createMemoDraft(),
    ...memo,
    title: memo.title || '',
    content: memo.content || '',
    tags: Array.isArray(memo.tags) ? memo.tags : [],
    color: memo.color || '#fff7ed',
    pinned: Boolean(memo.pinned),
    archived: Boolean(memo.archived),
    createdAt: memo.createdAt || now,
    updatedAt: memo.updatedAt || memo.createdAt || now
  }
}

function flash(message) {
  statusMessage.value = message
  window.setTimeout(() => {
    if (statusMessage.value === message) statusMessage.value = ''
  }, 1800)
}
</script>

<template>
  <main class="app-shell">
    <header class="hero">
      <div>
        <p class="eyebrow">Card Memo</p>
        <h1>卡片式备忘录</h1>
        <p class="hero-text">新增一张卡片，记录客户沟通、开发思路、临时待办或任何你想留下的内容。</p>
      </div>
      <div class="stats-card">
        <strong>{{ activeMemos.length }}</strong>
        <span>当前卡片</span>
      </div>
    </header>

    <CloudPanel
      v-model:token="cloudToken"
      :loading="cloudLoading"
      :status="cloudStatus"
      :total="memos.length"
      @save-token="handleSaveCloudToken"
      @pull="pullFromCloud"
      @push="pushToCloud"
    />

    <Toolbar
      :query="query"
      :active-tag="activeTag"
      :view-mode="viewMode"
      :tags="tagOptions"
      :total="visibleMemos.length"
      @update:query="query = $event"
      @update:active-tag="activeTag = $event"
      @update:view-mode="viewMode = $event"
      @add="openNewMemo"
      @export="handleExport"
      @import="handleImport"
    />

    <p v-if="statusMessage" class="toast">{{ statusMessage }}</p>

    <EmptyState v-if="!memos.length" @add="openNewMemo" />

    <section v-else-if="!visibleMemos.length" class="empty-state compact">
      <div class="empty-icon">🔍</div>
      <h2>没有匹配的卡片</h2>
      <p>换一个关键词或标签试试。</p>
    </section>

    <section v-else class="memo-grid">
      <MemoCard
        v-for="memo in visibleMemos"
        :key="memo.id"
        :memo="memo"
        @edit="openEditMemo"
        @toggle-pin="togglePin"
        @toggle-archive="toggleArchive"
        @remove="removeMemo"
      />
    </section>

    <MemoEditor
      :open="editorOpen"
      :memo="editingMemo"
      @close="editorOpen = false"
      @save="handleSave"
    />
  </main>
</template>

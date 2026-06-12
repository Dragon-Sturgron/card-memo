<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import MemoCard from './components/MemoCard.vue'
import MemoEditor from './components/MemoEditor.vue'
import Toolbar from './components/Toolbar.vue'
import EmptyState from './components/EmptyState.vue'
import PasswordGate from './components/PasswordGate.vue'
import CategorySettings from './components/CategorySettings.vue'
import { deleteMemo, getAllMemos, replaceMemos, saveMemo } from './db'
import { fetchCloudData, loadCloudPassword, pushCloudData, saveCloudPassword } from './cloudApi'
import { createMemoDraft, loadCategories, normalizeCategories, saveCategories } from './utils'

const memos = ref([])
const categories = ref(loadCategories())
const query = ref('')
const activeCategory = ref('全部')
const viewMode = ref('active')
const editorOpen = ref(false)
const currentPage = ref('home')
const editingMemo = ref(null)
const statusMessage = ref('')
const cloudPassword = ref('')
const appUnlocked = ref(false)
const passwordLoading = ref(false)
const passwordError = ref('')
const cloudLoading = ref(false)
const cloudStatus = ref('')
const cloudPending = ref(false)
const lastCloudSavedAt = ref('')

const AUTO_SAVE_DELAY = 1200
let autoSaveTimer = null
let isApplyingCloudData = false
let cloudSaveSequence = 0

onMounted(async () => {
  syncPageFromHash()
  window.addEventListener('hashchange', syncPageFromHash)

  const savedPassword = loadCloudPassword()
  if (savedPassword) {
    await handlePasswordSubmit(savedPassword, { silent: true })
  }
})

onBeforeUnmount(() => {
  if (autoSaveTimer) window.clearTimeout(autoSaveTimer)
  window.removeEventListener('hashchange', syncPageFromHash)
})

async function handlePasswordSubmit(password, options = {}) {
  const value = String(password || '').trim()
  if (!value) return

  passwordLoading.value = true
  passwordError.value = ''

  try {
    const cloudResult = await fetchCloudData(value)
    saveCloudPassword(value)
    cloudPassword.value = value
    appUnlocked.value = true

    await loadMemos()
    await initializeFromCloud(cloudResult)
  } catch (error) {
    console.error(error)
    saveCloudPassword('')
    cloudPassword.value = ''
    appUnlocked.value = false
    passwordError.value = options.silent ? '' : error.message
  } finally {
    passwordLoading.value = false
  }
}

async function loadMemos() {
  const data = await getAllMemos()
  memos.value = sortMemos(cleanMemoList(data))
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
    const category = memo.category || categories.value[0] || ''
    const matchMode = viewMode.value === 'archived' ? memo.archived : !memo.archived
    const matchCategory = activeCategory.value === '全部' || category === activeCategory.value
    const haystack = [memo.title, memo.content, category].join(' ').toLowerCase()
    const matchKeyword = !keyword || haystack.includes(keyword)
    return matchMode && matchCategory && matchKeyword
  })
})

const activeMemos = computed(() => memos.value.filter((memo) => !memo.archived))

const categoryOptions = computed(() => {
  const counter = new Map()
  for (const memo of memos.value) {
    if (viewMode.value === 'active' && memo.archived) continue
    if (viewMode.value === 'archived' && !memo.archived) continue
    const category = memo.category || categories.value[0] || ''
    counter.set(category, (counter.get(category) || 0) + 1)
  }

  const defined = categories.value.map((name) => ({ name, count: counter.get(name) || 0 }))
  const extra = [...counter.entries()]
    .filter(([name]) => name && !categories.value.includes(name))
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

  return [...defined, ...extra]
})

function openNewMemo() {
  const draft = createMemoDraft()
  draft.category = categories.value[0] || ''
  editingMemo.value = draft
  editorOpen.value = true
}

function syncPageFromHash() {
  currentPage.value = window.location.hash === '#/settings' ? 'settings' : 'home'
}

function openSettingsPage() {
  currentPage.value = 'settings'
  window.location.hash = '#/settings'
}

function backToHome() {
  currentPage.value = 'home'
  if (window.location.hash === '#/settings') {
    window.location.hash = '#/'
  }
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
  scheduleCloudSave()
}

async function togglePin(memo) {
  await saveMemo({ ...memo, pinned: !memo.pinned, updatedAt: new Date().toISOString() })
  await loadMemos()
  scheduleCloudSave()
}

async function toggleArchive(memo) {
  await saveMemo({ ...memo, archived: !memo.archived, updatedAt: new Date().toISOString() })
  await loadMemos()
  flash(memo.archived ? '卡片已恢复' : '卡片已归档')
  scheduleCloudSave()
}

async function removeMemo(memo) {
  const ok = window.confirm(`确定删除${memo.title ? `「${memo.title}」` : '这张卡片'}吗？删除后不可恢复。`)
  if (!ok) return

  await deleteMemo(memo.id)
  await loadMemos()
  flash('卡片已删除')
  scheduleCloudSave()
}

async function handleCategoriesSave(payload) {
  const nextCategories = saveCategories(payload.categories)
  const fallbackCategory = nextCategories[0] || ''
  const renameMap = payload.renameMap || {}
  const removed = new Set(payload.removed || [])
  let changedMemos = memos.value.map((memo) => {
    let nextCategory = memo.category || ''
    if (renameMap[nextCategory]) nextCategory = renameMap[nextCategory]
    if (removed.has(nextCategory)) nextCategory = fallbackCategory
    if (!nextCategory) nextCategory = fallbackCategory
    return normalizeMemo({ ...memo, category: nextCategory, updatedAt: new Date().toISOString() })
  })

  categories.value = nextCategories
  activeCategory.value = '全部'
  backToHome()

  await replaceMemos(changedMemos)
  await loadMemos()
  flash('分类设置已保存')
  scheduleCloudSave('分类设置已保存，等待自动保存到 KV...')
}

async function initializeFromCloud(preloadedResult = null) {
  cloudLoading.value = true
  cloudStatus.value = '正在检查云端数据...'

  try {
    const result = preloadedResult || (await fetchCloudData(cloudPassword.value.trim()))
    const cloudCategories = normalizeCategories(result?.data?.categories || [])

    if (cloudCategories.length) {
      categories.value = saveCategories(cloudCategories)
    }

    const cloudMemos = cleanMemoList(result?.data?.memos || [])

    if (cloudMemos.length && memos.value.length === 0) {
      await applyCloudData(cloudMemos, cloudCategories)
      cloudStatus.value = `已自动从 KV 恢复 ${cloudMemos.length} 张卡片。后续修改会自动保存。`
      flash('已从云端恢复卡片')
      return
    }

    if (!cloudMemos.length && memos.value.length) {
      scheduleCloudSave('云端暂无卡片，等待自动把当前本地卡片保存到 KV...')
    } else {
      cloudStatus.value = '自动保存已开启。'
    }
  } catch (error) {
    console.error(error)
    cloudStatus.value = `自动保存未连接：${error.message}`
  } finally {
    cloudLoading.value = false
  }
}

async function applyCloudData(cloudMemos, cloudCategories = []) {
  isApplyingCloudData = true
  try {
    if (cloudCategories.length) {
      categories.value = saveCategories(cloudCategories)
    }
    await replaceMemos(cloudMemos)
    await loadMemos()
    activeCategory.value = '全部'
    viewMode.value = 'active'
  } finally {
    isApplyingCloudData = false
  }
}

function scheduleCloudSave(message = '本地已保存，等待自动保存到 KV...') {
  if (isApplyingCloudData || !appUnlocked.value || !cloudPassword.value.trim()) return

  cloudPending.value = true
  cloudStatus.value = message

  if (autoSaveTimer) window.clearTimeout(autoSaveTimer)
  autoSaveTimer = window.setTimeout(() => {
    autoSaveTimer = null
    saveToCloudNow({ automatic: true })
  }, AUTO_SAVE_DELAY)
}

async function saveToCloudNow(options = {}) {
  if (autoSaveTimer) {
    window.clearTimeout(autoSaveTimer)
    autoSaveTimer = null
  }

  const currentSequence = ++cloudSaveSequence
  const snapshot = {
    memos: memos.value.map((memo) => ({ ...memo })),
    categories: [...categories.value]
  }
  const automatic = options.automatic !== false

  cloudPending.value = false
  cloudLoading.value = true
  cloudStatus.value = automatic ? '正在自动保存到 KV...' : '正在保存到 KV...'

  try {
    const result = await pushCloudData(snapshot, cloudPassword.value.trim())
    if (currentSequence !== cloudSaveSequence) return

    lastCloudSavedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    cloudStatus.value = `已自动保存 ${result?.data?.count ?? snapshot.memos.length} 张卡片到 KV（${lastCloudSavedAt.value}）。`
    flash('已保存到云端')
  } catch (error) {
    console.error(error)
    if (currentSequence === cloudSaveSequence) {
      cloudStatus.value = `自动保存失败：${error.message}。本地数据已保留。`
      flash('自动保存失败，本地数据已保留')
    }
  } finally {
    if (currentSequence === cloudSaveSequence) {
      cloudLoading.value = false
    }
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
    category: memo.category || memo.tags?.[0] || categories.value[0] || '',
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
  <PasswordGate
    v-if="!appUnlocked"
    :loading="passwordLoading"
    :error="passwordError"
    @submit="handlePasswordSubmit"
  />

  <main v-else class="app-shell">
    <CategorySettings
      v-if="currentPage === 'settings'"
      :categories="categories"
      @back="backToHome"
      @save="handleCategoriesSave"
    />

    <template v-else>
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

      <Toolbar
        :query="query"
        :active-category="activeCategory"
        :view-mode="viewMode"
        :categories="categoryOptions"
        :total="visibleMemos.length"
        @update:query="query = $event"
        @update:active-category="activeCategory = $event"
        @update:view-mode="viewMode = $event"
        @add="openNewMemo"
        @settings="openSettingsPage"
      />

      <p v-if="statusMessage" class="toast">{{ statusMessage }}</p>

      <EmptyState v-if="!memos.length" @add="openNewMemo" />

      <section v-else-if="!visibleMemos.length" class="empty-state compact">
        <div class="empty-icon">🔍</div>
        <h2>没有匹配的卡片</h2>
        <p>换一个关键词或分类试试。</p>
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
        :categories="categories"
        @close="editorOpen = false"
        @save="handleSave"
      />
    </template>
  </main>
</template>

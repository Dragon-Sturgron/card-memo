<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import MemoCard from './components/MemoCard.vue'
import MemoEditor from './components/MemoEditor.vue'
import MemoDetail from './components/MemoDetail.vue'
import Toolbar from './components/Toolbar.vue'
import EmptyState from './components/EmptyState.vue'
import CategorySettings from './components/CategorySettings.vue'
import { deleteMemo, getAllMemos, replaceMemos, saveMemo } from './db'
import { checkSession, fetchCloudData, logout, pushCloudData, redirectToLogin } from './cloudApi'
import { createMemoDraft, loadCategories, loadPreferences, normalizeCategories, normalizePreferences, saveCategories, savePreferences } from './utils'

const memos = ref([])
const categories = ref(loadCategories())
const preferences = ref(loadPreferences())
const query = ref('')
const activeCategory = ref('全部')
const viewMode = ref('active')
const editorOpen = ref(false)
const detailOpen = ref(false)
const currentPage = ref('home')
const editingMemo = ref(null)
const viewingMemo = ref(null)
const statusMessage = ref('')
const authChecking = ref(true)
const appUnlocked = ref(false)
const cloudLoading = ref(false)
const cloudStatus = ref('')
const cloudPending = ref(false)
const lastCloudSavedAt = ref('')
const deleteConfirmOpen = ref(false)
const deletingMemo = ref(null)

const AUTO_SAVE_DELAY = 300
const CLOUD_REFRESH_MIN_INTERVAL = 1500
const SYNC_META_KEY = 'card-memo-sync-meta'
let autoSaveTimer = null
let isApplyingCloudData = false
let cloudSaveSequence = 0
let lastCloudRefreshAt = 0

onMounted(async () => {
  syncPageFromHash()
  window.addEventListener('hashchange', syncPageFromHash)
  window.addEventListener('focus', handleWindowFocus)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  await bootApp()
})

onBeforeUnmount(() => {
  if (autoSaveTimer) window.clearTimeout(autoSaveTimer)
  window.removeEventListener('hashchange', syncPageFromHash)
  window.removeEventListener('focus', handleWindowFocus)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

function handleWindowFocus() {
  refreshFromCloudIfNeeded()
}

function handleVisibilityChange() {
  if (!document.hidden) refreshFromCloudIfNeeded()
}

function refreshFromCloudIfNeeded() {
  if (!appUnlocked.value || authChecking.value || isApplyingCloudData) return
  refreshFromCloud({ silent: true })
}

async function bootApp() {
  authChecking.value = true

  try {
    await checkSession()
    appUnlocked.value = true
    await loadMemos()
    ensureLocalMetaFromMemos()
    await initializeFromCloud({ force: true })
  } catch (error) {
    console.error(error)
    if (error.status === 401) {
      redirectToLogin()
      return
    }

    appUnlocked.value = true
    await loadMemos()
    flash(`云端连接异常：${error.message}。已进入本地模式。`)
  } finally {
    authChecking.value = false
  }
}

async function loadMemos() {
  const data = await getAllMemos()
  memos.value = sortMemos(cleanMemoList(data))
}

function readSyncMeta() {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY)
    return raw ? JSON.parse(raw) || {} : {}
  } catch (error) {
    console.warn('读取同步状态失败。', error)
    return {}
  }
}

function writeSyncMeta(patch) {
  const next = {
    ...readSyncMeta(),
    ...patch
  }
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(next))
  return next
}

function dateValue(value) {
  const time = Date.parse(value || '')
  return Number.isFinite(time) ? time : 0
}

function getLatestMemoUpdatedAt(list = memos.value) {
  let latest = 0
  for (const memo of list) {
    latest = Math.max(latest, dateValue(memo.updatedAt), dateValue(memo.createdAt))
  }
  return latest ? new Date(latest).toISOString() : ''
}

function ensureLocalMetaFromMemos() {
  const meta = readSyncMeta()
  if (!meta.localUpdatedAt) {
    const latest = getLatestMemoUpdatedAt()
    if (latest) writeSyncMeta({ localUpdatedAt: latest })
  }
}

function touchLocalChange(timestamp = new Date().toISOString()) {
  writeSyncMeta({ localUpdatedAt: timestamp })
  return timestamp
}

function markCloudSynced(cloudUpdatedAt = new Date().toISOString()) {
  writeSyncMeta({
    localUpdatedAt: cloudUpdatedAt,
    cloudUpdatedAt,
    lastSyncedAt: cloudUpdatedAt
  })
}

function hasUnsyncedLocalChange(meta = readSyncMeta()) {
  const localTime = dateValue(meta.localUpdatedAt)
  const cloudTime = dateValue(meta.cloudUpdatedAt)
  return Boolean(cloudTime && localTime > cloudTime)
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

function cloneMemo(memo) {
  if (!memo) return null
  return JSON.parse(JSON.stringify(memo))
}

function openNewMemo() {
  const draft = createMemoDraft()
  draft.category = categories.value[0] || ''
  editingMemo.value = draft
  editorOpen.value = true
}

function openDetailMemo(memo) {
  viewingMemo.value = cloneMemo(memo)
  detailOpen.value = true
}

function closeDetailMemo() {
  detailOpen.value = false
  viewingMemo.value = null
}

function openEditFromDetail(memo) {
  detailOpen.value = false
  viewingMemo.value = null
  openEditMemo(memo)
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
  editingMemo.value = cloneMemo(memo)
  editorOpen.value = true
}

function handleLogout() {
  logout()
}

async function handleSave(memo) {
  const now = new Date().toISOString()
  const normalized = normalizeMemo({
    ...memo,
    createdAt: memo.createdAt || now,
    updatedAt: now
  })

  await saveMemo(normalized)
  touchLocalChange(now)
  await loadMemos()
  editorOpen.value = false
  editingMemo.value = null
  closeDetailMemo()
  flash('卡片已保存')
  scheduleCloudSave()
}

async function togglePin(memo) {
  const now = new Date().toISOString()
  await saveMemo({ ...memo, pinned: !memo.pinned, updatedAt: now })
  touchLocalChange(now)
  await loadMemos()
  if (viewingMemo.value?.id === memo.id) {
    viewingMemo.value = cloneMemo(memos.value.find((item) => item.id === memo.id) || { ...cloneMemo(memo), pinned: !memo.pinned, updatedAt: now })
  }
  scheduleCloudSave()
}

async function toggleArchive(memo) {
  const now = new Date().toISOString()
  await saveMemo({ ...memo, archived: !memo.archived, updatedAt: now })
  touchLocalChange(now)
  await loadMemos()
  if (viewingMemo.value?.id === memo.id) {
    viewingMemo.value = cloneMemo(memos.value.find((item) => item.id === memo.id) || { ...cloneMemo(memo), archived: !memo.archived, updatedAt: now })
  }
  flash(memo.archived ? '卡片已恢复' : '卡片已归档')
  scheduleCloudSave()
}

function removeMemo(memo) {
  deletingMemo.value = cloneMemo(memo)
  deleteConfirmOpen.value = true
}

function cancelDeleteMemo() {
  deleteConfirmOpen.value = false
  deletingMemo.value = null
}

async function confirmDeleteMemo() {
  const memo = deletingMemo.value
  if (!memo?.id) return cancelDeleteMemo()

  await deleteMemo(memo.id)
  touchLocalChange()
  await loadMemos()
  if (viewingMemo.value?.id === memo.id) closeDetailMemo()
  cancelDeleteMemo()
  flash('卡片已删除')
  scheduleCloudSave()
}

async function handleCategoriesSave(payload) {
  const now = new Date().toISOString()
  const nextCategories = saveCategories(payload.categories)
  const nextPreferences = savePreferences(payload.preferences || preferences.value)
  const fallbackCategory = nextCategories[0] || ''
  const renameMap = payload.renameMap || {}
  const removed = new Set(payload.removed || [])
  const changedMemos = memos.value.map((memo) => {
    let nextCategory = memo.category || ''
    if (renameMap[nextCategory]) nextCategory = renameMap[nextCategory]
    if (removed.has(nextCategory)) nextCategory = fallbackCategory
    if (!nextCategory) nextCategory = fallbackCategory
    return normalizeMemo({ ...memo, category: nextCategory, updatedAt: now })
  })

  categories.value = nextCategories
  preferences.value = nextPreferences
  activeCategory.value = '全部'

  await replaceMemos(changedMemos)
  touchLocalChange(now)
  await loadMemos()
  flash('分类设置已保存')
  scheduleCloudSave('分类设置已保存，正在同步到 KV...')
}

async function initializeFromCloud(options = {}) {
  await refreshFromCloud({ initial: true, ...options })
}

async function refreshFromCloud(options = {}) {
  if (!appUnlocked.value) return

  const { silent = false, force = false } = options
  const now = Date.now()
  if (!force && now - lastCloudRefreshAt < CLOUD_REFRESH_MIN_INTERVAL) return

  lastCloudRefreshAt = now
  cloudLoading.value = true
  if (!silent) cloudStatus.value = '正在检查云端数据...'

  try {
    const result = await fetchCloudData()
    const payload = result?.data || {}
    const cloudUpdatedAt = payload.updatedAt || ''
    const cloudTime = dateValue(cloudUpdatedAt)
    const cloudCategories = normalizeCategories(payload.categories || [])
    const cloudPreferences = normalizePreferences(payload.preferences || {})
    const cloudMemos = cleanMemoList(payload.memos || [])

    const meta = readSyncMeta()
    const knownCloudTime = dateValue(meta.cloudUpdatedAt)
    const localTime = dateValue(meta.localUpdatedAt || getLatestMemoUpdatedAt())
    const localHasUnsyncedChange = hasUnsyncedLocalChange(meta)
    const cloudIsNewerThanKnown = cloudTime && cloudTime > knownCloudTime
    const cloudIsNewerThanLocal = cloudTime && cloudTime >= localTime

    if (cloudTime && cloudIsNewerThanKnown && (!localHasUnsyncedChange || cloudIsNewerThanLocal)) {
      await applyCloudData(cloudMemos, cloudCategories, cloudPreferences, cloudUpdatedAt)
      cloudStatus.value = cloudMemos.length
        ? `已同步云端最新数据：${cloudMemos.length} 张卡片。`
        : '已同步云端最新数据。'
      if (!silent) flash('已同步云端最新数据')
      return
    }

    if (!cloudTime && memos.value.length) {
      scheduleCloudSave('云端暂无数据，正在自动上传本地数据...')
      return
    }

    if (localHasUnsyncedChange && (!cloudTime || localTime > cloudTime)) {
      scheduleCloudSave('检测到本地有未同步修改，正在自动上传到 KV...')
      return
    }

    if (cloudTime && cloudIsNewerThanKnown && localHasUnsyncedChange) {
      cloudStatus.value = '云端有更新，但本地也有未同步修改，暂未覆盖本地内容。'
      if (!silent) flash('本地和云端都有修改，已保留本地内容')
      return
    }

    if (cloudTime && cloudIsNewerThanKnown) {
      writeSyncMeta({ cloudUpdatedAt })
    }

    cloudStatus.value = '自动同步已开启。'
  } catch (error) {
    console.error(error)
    if (error.status === 401) {
      redirectToLogin()
      return
    }
    cloudStatus.value = `自动同步未连接：${error.message}`
    if (!silent) flash(`云端同步异常：${error.message}`)
  } finally {
    cloudLoading.value = false
  }
}

async function applyCloudData(cloudMemos, cloudCategories = [], cloudPreferences = null, cloudUpdatedAt = '') {
  isApplyingCloudData = true
  try {
    if (cloudCategories.length) {
      categories.value = saveCategories(cloudCategories)
    }
    if (cloudPreferences) {
      preferences.value = savePreferences(cloudPreferences)
    }
    await replaceMemos(cloudMemos)
    await loadMemos()
    activeCategory.value = '全部'
    viewMode.value = 'active'
    markCloudSynced(cloudUpdatedAt || getLatestMemoUpdatedAt(cloudMemos) || new Date().toISOString())
  } finally {
    isApplyingCloudData = false
  }
}

function scheduleCloudSave(message = '本地已保存，等待自动保存到 KV...') {
  if (isApplyingCloudData || !appUnlocked.value) return

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
    categories: [...categories.value],
    preferences: { ...preferences.value }
  }
  const automatic = options.automatic !== false

  cloudPending.value = false
  cloudLoading.value = true
  cloudStatus.value = automatic ? '正在自动保存到 KV...' : '正在保存到 KV...'

  try {
    const result = await pushCloudData(snapshot)
    if (currentSequence !== cloudSaveSequence) return

    const serverUpdatedAt = result?.data?.updatedAt || new Date().toISOString()
    markCloudSynced(serverUpdatedAt)
    lastCloudSavedAt.value = new Date(serverUpdatedAt).toLocaleTimeString('zh-CN', { hour12: false })
    cloudStatus.value = `已自动保存 ${result?.data?.count ?? snapshot.memos.length} 张卡片到 KV（${lastCloudSavedAt.value}）。`
    flash('已保存到云端')
  } catch (error) {
    console.error(error)
    if (error.status === 401) {
      redirectToLogin()
      return
    }
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
  <main v-if="authChecking" class="password-page">
    <section class="password-card">
      <p class="eyebrow">Card Memo</p>
      <h1>正在验证登录状态...</h1>
    </section>
  </main>

  <main v-else-if="appUnlocked" class="app-shell">
    <p v-if="statusMessage" class="toast">{{ statusMessage }}</p>

    <CategorySettings
      v-if="currentPage === 'settings'"
      :categories="categories"
      :preferences="preferences"
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
        @logout="handleLogout"
      />

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
          @view="openDetailMemo"
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
        :allow-backdrop-close="preferences.closeEditorOnBackdrop"
        @close="editorOpen = false"
        @save="handleSave"
      />

      <MemoDetail
        :open="detailOpen"
        :memo="viewingMemo"
        @close="closeDetailMemo"
        @edit="openEditFromDetail"
        @toggle-pin="togglePin"
        @toggle-archive="toggleArchive"
        @remove="removeMemo"
      />

      <Teleport to="body">
        <div v-if="deleteConfirmOpen" class="confirm-mask" @click.self="cancelDeleteMemo">
          <section class="confirm-dialog delete-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title">
            <button class="confirm-close" aria-label="关闭" @click="cancelDeleteMemo">×</button>
            <div class="delete-confirm-icon">🗑️</div>
            <p class="eyebrow danger-eyebrow">删除卡片</p>
            <h2 id="delete-confirm-title">确定删除这张卡片？</h2>
            <p class="confirm-text">
              {{ deletingMemo?.title ? `「${deletingMemo.title}」` : '这张卡片' }} 删除后不可恢复，且会自动同步到 KV。
            </p>
            <footer class="confirm-footer confirm-footer-split">
              <button class="secondary-button" @click="cancelDeleteMemo">取消</button>
              <button class="danger-button" @click="confirmDeleteMemo">确认删除</button>
            </footer>
          </section>
        </div>
      </Teleport>
    </template>
  </main>
</template>

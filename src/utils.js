export const CARD_COLORS = [
  '#fff7ed',
  '#fef9c3',
  '#dcfce7',
  '#e0f2fe',
  '#ede9fe',
  '#ffe4e6',
  '#f5f5f4'
]

export const DEFAULT_CATEGORIES = ['工作', '生活', '开发', '客户', '待办']

const CATEGORY_STORAGE_KEY = 'card-memo-categories'

export function createMemoDraft() {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: '',
    content: '',
    category: '',
    color: CARD_COLORS[0],
    pinned: false,
    archived: false,
    createdAt: now,
    updatedAt: now
  }
}

export function normalizeCategories(input) {
  const list = Array.isArray(input) ? input : []
  return [
    ...new Set(
      list
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )
  ]
}

export function loadCategories() {
  try {
    const raw = localStorage.getItem(CATEGORY_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    const saved = normalizeCategories(parsed)
    return saved.length ? saved : [...DEFAULT_CATEGORIES]
  } catch (error) {
    console.warn('读取分类失败，使用默认分类。', error)
    return [...DEFAULT_CATEGORIES]
  }
}

export function saveCategories(categories) {
  const normalized = normalizeCategories(categories)
  localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

export function formatDate(dateString) {
  if (!dateString) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString))
}

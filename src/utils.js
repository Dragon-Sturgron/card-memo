export const CARD_COLORS = [
  '#fff7ed',
  '#fef9c3',
  '#dcfce7',
  '#e0f2fe',
  '#ede9fe',
  '#ffe4e6',
  '#f5f5f4'
]

export function createMemoDraft() {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: '',
    content: '',
    tags: [],
    color: CARD_COLORS[0],
    pinned: false,
    archived: false,
    createdAt: now,
    updatedAt: now
  }
}

export function normalizeTags(input) {
  if (Array.isArray(input)) return [...new Set(input.map((tag) => String(tag).trim()).filter(Boolean))]

  return [
    ...new Set(
      String(input || '')
        .split(/[，,\s#]+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  ]
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

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result))
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

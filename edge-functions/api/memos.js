const STORAGE_KEY = 'card_memo_data'
const MAX_MEMOS = 5000
const MAX_CATEGORIES = 200
const AUTH_COOKIE_NAME = 'memo_auth'

const DEFAULT_PREFERENCES = {
  closeEditorOnBackdrop: false
}

async function handleRequest(context) {
  const request = context.request

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  try {
    const authError = await checkAuth(context)
    if (authError) return authError

    const kv = getKV(context)
    if (!kv) {
      return json(
        {
          success: false,
          message: '未找到 KV 绑定。请在 EdgeOne 项目中绑定 KV 命名空间，变量名设置为 MEMO_KV。'
        },
        500
      )
    }

    if (request.method === 'GET') {
      const data = await kv.get(STORAGE_KEY, { type: 'json' })
      return json({
        success: true,
        data: normalizePayload(data || { memos: [], categories: [], updatedAt: null })
      })
    }

    if (request.method === 'PUT' || request.method === 'POST') {
      const body = await request.json().catch(() => null)
      if (!body || !Array.isArray(body.memos)) {
        return json({ success: false, message: '请求体必须是 { memos: [], categories: [] }。' }, 400)
      }

      const memos = normalizeMemos(body.memos)
      const categories = normalizeCategories(body.categories || [])
      const preferences = normalizePreferences(body.preferences || {})

      if (memos.length > MAX_MEMOS) {
        return json({ success: false, message: `单次最多同步 ${MAX_MEMOS} 张卡片。` }, 400)
      }

      if (categories.length > MAX_CATEGORIES) {
        return json({ success: false, message: `单次最多同步 ${MAX_CATEGORIES} 个分类。` }, 400)
      }

      const payload = {
        app: 'card-memo',
        version: 3,
        updatedAt: new Date().toISOString(),
        categories,
        preferences,
        memos
      }

      await kv.put(STORAGE_KEY, JSON.stringify(payload))

      return json({
        success: true,
        data: {
          updatedAt: payload.updatedAt,
          count: memos.length,
          categoryCount: categories.length,
          preferences
        }
      })
    }

    return json({ success: false, message: 'Method Not Allowed' }, 405, {
      Allow: 'GET, PUT, POST, OPTIONS'
    })
  } catch (error) {
    return json({ success: false, message: error?.message || '服务器内部错误。' }, 500)
  }
}

function getKV(context) {
  return context?.env?.MEMO_KV || globalThis.MEMO_KV
}

function getEnvValue(context, name) {
  const fromContext = context?.env?.[name]
  if (fromContext !== undefined && fromContext !== null) return String(fromContext)
  const fromGlobal = globalThis[name]
  if (fromGlobal !== undefined && fromGlobal !== null) return String(fromGlobal)
  return ''
}

function getMemoPassword(context) {
  return getEnvValue(context, 'MEMO_PASSWORD').trim() || getEnvValue(context, 'ADMIN').trim()
}

function getAuthSecret(context) {
  return getEnvValue(context, 'AUTH_SECRET').trim() || getEnvValue(context, 'MEMO_AUTH_SECRET').trim() || getMemoPassword(context)
}

async function checkAuth(context) {
  const expectedPassword = getMemoPassword(context)

  if (!expectedPassword) {
    return json(
      {
        success: false,
        message: '未配置访问密码。请在 EdgeOne Pages 项目环境变量中设置 MEMO_PASSWORD。'
      },
      500
    )
  }

  const cookies = parseCookies(context.request.headers.get('Cookie') || '')
  const actualToken = cookies[AUTH_COOKIE_NAME] || ''
  const expectedToken = await createAuthToken(context)

  if (!timingSafeEqual(actualToken, expectedToken)) {
    return json({ success: false, message: '未登录或登录已过期。' }, 401)
  }

  return null
}

async function createAuthToken(context) {
  const request = context.request
  const userAgent = request.headers.get('User-Agent') || ''
  const password = getMemoPassword(context)
  const secret = getAuthSecret(context)
  return sha256(`${userAgent}\n${password}\n${secret}`)
}

async function sha256(input) {
  const encoder = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(input))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function parseCookies(cookieHeader) {
  const result = {}
  for (const part of cookieHeader.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    const key = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (key) result[key] = decodeURIComponent(value)
  }
  return result
}

function timingSafeEqual(a, b) {
  const left = String(a || '')
  const right = String(b || '')
  if (left.length !== right.length) return false

  let diff = 0
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i)
  }
  return diff === 0
}

function normalizePayload(data) {
  return {
    app: 'card-memo',
    version: Number(data?.version || 1),
    updatedAt: data?.updatedAt || null,
    categories: normalizeCategories(data?.categories || []),
    preferences: normalizePreferences(data?.preferences || {}),
    memos: normalizeMemos(data?.memos || [])
  }
}

function normalizeCategories(input) {
  return [
    ...new Set(
      (Array.isArray(input) ? input : [])
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .slice(0, MAX_CATEGORIES)
    )
  ]
}

function normalizePreferences(input) {
  const source = input && typeof input === 'object' ? input : {}
  return {
    ...DEFAULT_PREFERENCES,
    closeEditorOnBackdrop: Boolean(source.closeEditorOnBackdrop)
  }
}

function normalizeMemos(input) {
  return input
    .filter((item) => item && typeof item === 'object' && item.id && (item.title || item.content))
    .map((item) => ({
      id: String(item.id),
      title: String(item.title || ''),
      content: String(item.content || ''),
      category: String(item.category || (Array.isArray(item.tags) ? item.tags[0] || '' : '')),
      color: String(item.color || '#fff7ed'),
      pinned: Boolean(item.pinned),
      archived: Boolean(item.archived),
      createdAt: String(item.createdAt || new Date().toISOString()),
      updatedAt: String(item.updatedAt || item.createdAt || new Date().toISOString())
    }))
}

function corsHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...extra
  }
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      ...extraHeaders
    })
  })
}

export default handleRequest
export const onRequest = handleRequest

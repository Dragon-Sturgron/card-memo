const STORAGE_KEY = 'card_memo_data'
const MAX_MEMOS = 5000

async function handleRequest(context) {
  const request = context.request

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  try {
    const authError = checkAuth(context)
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
        data: data || { memos: [], updatedAt: null }
      })
    }

    if (request.method === 'PUT' || request.method === 'POST') {
      const body = await request.json().catch(() => null)
      if (!body || !Array.isArray(body.memos)) {
        return json({ success: false, message: '请求体必须是 { memos: [] }。' }, 400)
      }

      const memos = normalizeMemos(body.memos)
      if (memos.length > MAX_MEMOS) {
        return json({ success: false, message: `单次最多同步 ${MAX_MEMOS} 张卡片。` }, 400)
      }

      const payload = {
        app: 'card-memo',
        version: 1,
        updatedAt: new Date().toISOString(),
        memos
      }

      const text = JSON.stringify(payload)
      await kv.put(STORAGE_KEY, text)

      return json({
        success: true,
        data: {
          updatedAt: payload.updatedAt,
          count: memos.length
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

function checkAuth(context) {
  const expectedToken = getEnvValue(context, 'MEMO_TOKEN').trim()
  if (!expectedToken) return null

  const request = context.request
  const actualToken = request.headers.get('X-Memo-Token') || new URL(request.url).searchParams.get('token') || ''

  if (actualToken !== expectedToken) {
    return json({ success: false, message: '访问令牌不正确。' }, 401)
  }

  return null
}

function normalizeMemos(input) {
  return input
    .filter((item) => item && typeof item === 'object' && item.id && (item.title || item.content))
    .map((item) => ({
      id: String(item.id),
      title: String(item.title || ''),
      content: String(item.content || ''),
      tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag)).filter(Boolean) : [],
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
    'Access-Control-Allow-Headers': 'Content-Type, X-Memo-Token',
    ...extra
  }
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders
    })
  })
}

export default handleRequest
export const onRequest = handleRequest

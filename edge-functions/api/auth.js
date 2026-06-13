const AUTH_COOKIE_NAME = 'memo_auth'

async function handleRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  if (context.request.method !== 'GET') {
    return json({ success: false, message: 'Method Not Allowed' }, 405, { Allow: 'GET, OPTIONS' })
  }

  const authError = await checkAuth(context)
  if (authError) return authError

  return json({ success: true, authenticated: true })
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

function corsHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

const AUTH_COOKIE_NAME = 'memo_auth'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7

async function handleRequest(context) {
  const request = context.request

  if (request.method === 'GET') {
    const redirect = getSafeRedirect(request)
    const authError = await checkAuth(context)
    if (!authError) return redirectResponse(redirect)
    return html(renderLoginPage({ redirect }))
  }

  if (request.method === 'POST') {
    const redirect = getSafeRedirect(request)
    const expectedPassword = getMemoPassword(context)

    if (!expectedPassword) {
      return html(renderLoginPage({ redirect, error: '未配置访问密码，请先在 EdgeOne Pages 环境变量中设置 MEMO_PASSWORD。' }), 500)
    }

    const formData = await request.formData().catch(() => null)
    const actualPassword = String(formData?.get('password') || '').trim()
    const formRedirect = sanitizeRedirect(String(formData?.get('redirect') || redirect))

    if (actualPassword !== expectedPassword) {
      return html(renderLoginPage({ redirect: formRedirect, error: '密码不正确，请重新输入。' }), 401)
    }

    const token = await createAuthToken(context)
    const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''

    return new Response(null, {
      status: 302,
      headers: {
        Location: formRedirect,
        'Set-Cookie': `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Strict${secure}`
      }
    })
  }

  return new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'GET, POST' }
  })
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
  if (!expectedPassword) return new Response('Missing password', { status: 500 })

  const cookies = parseCookies(context.request.headers.get('Cookie') || '')
  const actualToken = cookies[AUTH_COOKIE_NAME] || ''
  const expectedToken = await createAuthToken(context)

  if (!timingSafeEqual(actualToken, expectedToken)) {
    return new Response('Unauthorized', { status: 401 })
  }

  return null
}

async function createAuthToken(context) {
  const userAgent = context.request.headers.get('User-Agent') || ''
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

function getSafeRedirect(request) {
  const url = new URL(request.url)
  return sanitizeRedirect(url.searchParams.get('redirect') || '/')
}

function sanitizeRedirect(value) {
  const redirect = String(value || '/').trim()
  if (!redirect.startsWith('/') || redirect.startsWith('//')) return '/'
  return redirect
}

function redirectResponse(location) {
  return new Response(null, {
    status: 302,
    headers: { Location: location }
  })
}

function html(content, status = 200) {
  return new Response(content, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  })
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderLoginPage({ redirect = '/', error = '' } = {}) {
  const safeRedirect = escapeHtml(sanitizeRedirect(redirect))
  const errorHtml = error ? `<p class="error">${escapeHtml(error)}</p>` : ''

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>登录 - 卡片式备忘录</title>
  <style>
    :root {
      color-scheme: light;
      font-family: Inter, "PingFang SC", "Microsoft YaHei", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #2b211c;
      background: #f8f2e8;
    }

    * { box-sizing: border-box; }

    body {
      min-height: 100vh;
      margin: 0;
      display: grid;
      place-items: center;
      padding: 24px;
      background:
        radial-gradient(circle at 12% 12%, rgba(255, 126, 50, 0.16), transparent 28%),
        radial-gradient(circle at 86% 4%, rgba(130, 186, 255, 0.16), transparent 28%),
        linear-gradient(135deg, #fff7ed 0%, #f8f2e8 48%, #eef5fb 100%);
    }

    .card {
      width: min(420px, 100%);
      padding: 34px;
      border-radius: 26px;
      background: rgba(255, 255, 255, 0.86);
      border: 1px solid rgba(43, 33, 28, 0.08);
      box-shadow: 0 24px 70px rgba(68, 49, 34, 0.18);
    }

    .eyebrow {
      margin: 0 0 10px;
      text-align: center;
      color: #f97316;
      font-size: 13px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-weight: 800;
    }

    h1 {
      margin: 0 0 22px;
      text-align: center;
      font-size: clamp(28px, 5vw, 38px);
      line-height: 1.08;
      letter-spacing: -0.08em;
    }

    form {
      display: grid;
      gap: 12px;
    }

    input {
      width: 100%;
      border: 1px solid rgba(43, 33, 28, 0.12);
      border-radius: 16px;
      padding: 15px 16px;
      font: inherit;
      background: rgba(255, 255, 255, 0.92);
      outline: none;
    }

    input:focus {
      border-color: rgba(249, 115, 22, 0.65);
      box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.12);
    }

    button {
      border: 0;
      border-radius: 999px;
      padding: 15px 18px;
      background: #2b211c;
      color: #fff;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 16px 30px rgba(43, 33, 28, 0.22);
    }

    button:hover { transform: translateY(-1px); }

    .error {
      margin: 12px 0 0;
      padding: 10px 12px;
      border-radius: 14px;
      color: #991b1b;
      background: #fee2e2;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <main class="card">
    <p class="eyebrow">Card Memo</p>
    <h1>请输入访问密码</h1>
    <form method="POST" action="/login">
      <input name="redirect" type="hidden" value="${safeRedirect}" />
      <input name="password" type="password" placeholder="输入访问密码" autocomplete="current-password" autofocus required />
      <button type="submit">立即登录</button>
    </form>
    ${errorHtml}
  </main>
</body>
</html>`
}

export default handleRequest
export const onRequest = handleRequest

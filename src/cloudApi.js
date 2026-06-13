const MEMOS_API_URL = '/api/memos'
const AUTH_API_URL = '/api/auth'

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const message = typeof data === 'object' && data?.message ? data.message : `请求失败：${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

export function redirectToLogin() {
  const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}` || '/'
  window.location.replace(`/login?redirect=${encodeURIComponent(redirect)}`)
}

export function logout() {
  window.location.href = '/logout'
}

export async function checkSession() {
  const response = await fetch(AUTH_API_URL, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json'
    }
  })

  return parseResponse(response)
}

export async function fetchCloudData() {
  const response = await fetch(`${MEMOS_API_URL}?_=${Date.now()}`, {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache'
    }
  })

  return parseResponse(response)
}

export async function pushCloudData({ memos, categories, preferences }) {
  const response = await fetch(`${MEMOS_API_URL}?_=${Date.now()}`, {
    method: 'PUT',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    },
    body: JSON.stringify({ memos, categories, preferences })
  })

  return parseResponse(response)
}

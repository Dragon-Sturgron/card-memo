const API_URL = '/api/memos'
const CLOUD_TOKEN_KEY = 'card-memo-cloud-token'

function buildHeaders(token) {
  const headers = {
    Accept: 'application/json'
  }

  if (token) headers['X-Memo-Token'] = token
  return headers
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const message = typeof data === 'object' && data?.message ? data.message : `请求失败：${response.status}`
    throw new Error(message)
  }

  return data
}

export function loadCloudToken() {
  return localStorage.getItem(CLOUD_TOKEN_KEY) || ''
}

export function saveCloudToken(token) {
  const value = String(token || '').trim()
  if (value) {
    localStorage.setItem(CLOUD_TOKEN_KEY, value)
  } else {
    localStorage.removeItem(CLOUD_TOKEN_KEY)
  }
}

export async function fetchCloudMemos(token) {
  const response = await fetch(API_URL, {
    method: 'GET',
    headers: buildHeaders(token)
  })

  return parseResponse(response)
}

export async function pushCloudMemos(memos, token) {
  const response = await fetch(API_URL, {
    method: 'PUT',
    headers: {
      ...buildHeaders(token),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ memos })
  })

  return parseResponse(response)
}

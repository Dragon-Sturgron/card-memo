const API_URL = '/api/memos'
const CLOUD_PASSWORD_KEY = 'card-memo-cloud-password'

function buildHeaders(password) {
  const headers = {
    Accept: 'application/json'
  }

  if (password) headers['X-Memo-Password'] = password
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

export function loadCloudPassword() {
  return sessionStorage.getItem(CLOUD_PASSWORD_KEY) || ''
}

export function saveCloudPassword(password) {
  const value = String(password || '').trim()
  if (value) {
    sessionStorage.setItem(CLOUD_PASSWORD_KEY, value)
  } else {
    sessionStorage.removeItem(CLOUD_PASSWORD_KEY)
  }
}

export function clearCloudPassword() {
  sessionStorage.removeItem(CLOUD_PASSWORD_KEY)
}

export async function fetchCloudData(password) {
  const response = await fetch(API_URL, {
    method: 'GET',
    headers: buildHeaders(password)
  })

  return parseResponse(response)
}

export async function pushCloudData({ memos, categories }, password) {
  const response = await fetch(API_URL, {
    method: 'PUT',
    headers: {
      ...buildHeaders(password),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ memos, categories })
  })

  return parseResponse(response)
}

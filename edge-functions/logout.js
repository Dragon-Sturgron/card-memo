const AUTH_COOKIE_NAME = 'memo_auth'

function handleRequest(context) {
  const secure = new URL(context.request.url).protocol === 'https:' ? '; Secure' : ''

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/login',
      'Set-Cookie': `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${secure}`
    }
  })
}

export default handleRequest
export const onRequest = handleRequest

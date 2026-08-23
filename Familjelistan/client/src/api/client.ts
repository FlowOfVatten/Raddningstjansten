/**
 * Thin API client. All requests go to /api/* (proxied to server in dev).
 */

const BASE = '/api'

// Azure Static Web Apps strips the Authorization header before it reaches Functions.
// Use a custom header that passes through unmodified.
function authHeaders(token: string | null): HeadersInit {
  return token ? { 'X-FL-Token': token } : {}
}

async function request<T>(
  method: string,
  path: string,
  token: string | null,
  body?: unknown
): Promise<T> {
  const url = `${BASE}${path}`
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const contentType = res.headers.get('content-type') ?? ''
  const raw = await res.text()

  let payload: any = null
  if (raw) {
    try {
      payload = JSON.parse(raw)
    } catch {
      payload = null
    }
  }

  if (!res.ok) {
    const messageFromBody = payload?.error || payload?.message
    if (messageFromBody) throw new Error(messageFromBody)

    if (res.status === 404) {
      throw new Error(`API-endpoint saknas: ${method} ${url}`)
    }

    if (!raw) {
      throw new Error(`Tomt svar från API (${res.status}). Kontrollera backend-konfigurationen.`)
    }

    if (!contentType.includes('application/json')) {
      throw new Error(`Ogiltigt API-svar (${res.status}). Förväntade JSON men fick ${contentType || 'okänd content-type'}.`)
    }

    throw new Error(`Request failed (${res.status})`)
  }

  if (!raw) {
    throw new Error('Tomt svar från API trots lyckad statuskod.')
  }

  if (!payload) {
    throw new Error('API svarade inte med giltig JSON.')
  }

  return payload as T
}

export const api = {
  get:    <T>(path: string, token: string | null) =>
    request<T>('GET', path, token),
  post:   <T>(path: string, token: string | null, body?: unknown) =>
    request<T>('POST', path, token, body),
  patch:  <T>(path: string, token: string | null, body?: unknown) =>
    request<T>('PATCH', path, token, body),
  delete: <T>(path: string, token: string | null) =>
    request<T>('DELETE', path, token),
}

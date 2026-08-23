/**
 * Thin API client. All requests go to /api/* (proxied to server in dev).
 */

const BASE = '/api'

function authHeaders(token: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(
  method: string,
  path: string,
  token: string | null,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Request failed')
  return json as T
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

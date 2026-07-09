export function jsonHeaders() {
  return { 'Content-Type': 'application/json' }
}

export function escHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { ...jsonHeaders(), ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || res.statusText)
  }
  return res.json()
}
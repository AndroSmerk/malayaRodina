import { jsonHeaders, escHtml } from '../shared/api.js'
import { getTypeIcon, getTypeLabel } from '../shared/icons.js'

async function init() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  if (user.name) document.getElementById('user-avatar').textContent =
    user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  document.getElementById('user-avatar').addEventListener('click', () => { window.location.href = '/profile/' })

  let places = []
  try {
    const res = await fetch('/api/places', { headers: jsonHeaders() })
    if (res.ok) places = await res.json()
  } catch {}

  const grid = document.getElementById('places-grid')

  if (!places.length) {
    grid.innerHTML = '<div class="empty-state"><div class="icon">📍</div><p>Пока нет добавленных мест</p><a href="/map/" class="btn-primary" style="display:inline-block;margin-top:16px;padding:10px 24px;">Добавить на карте</a></div>'
    return
  }

  grid.innerHTML = places.map(p =>
    `<a href="/place/?id=${p.id}" class="place-card">
      <div class="card-pin ${p.type}">${getTypeIcon(p.type)}</div>
      <div class="card-body">
        <div class="card-name">${escHtml(p.name)}</div>
        <div class="card-type">${getTypeLabel(p.type)}</div>
        ${p.region ? `<div class="card-region">${escHtml(p.region)}</div>` : ''}
        <div class="card-stats">
          <span>📝 ${p.memories}</span>
          <span>📸 ${p.photos}</span>
          <span>🎬 ${p.videos}</span>
          <span>👤 ${p.neighbors}</span>
        </div>
      </div>
    </a>`
  ).join('')
}

document.addEventListener('DOMContentLoaded', init)

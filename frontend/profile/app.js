import { jsonHeaders, escHtml } from '../shared/api.js'

const API = {
  async getProfile() {
    const res = await fetch(`/api/profile`, { headers: jsonHeaders() })
    if (!res.ok) throw new Error('Profile not found')
    return res.json()
  },
  async getStats() {
    const res = await fetch(`/api/profile/stats`, { headers: jsonHeaders() })
    if (!res.ok) return { places: 0, memories: 0, photos: 0, videos: 0 }
    return res.json()
  },
  async getRecentMemories() {
    const res = await fetch(`/api/profile/memories`, { headers: jsonHeaders() })
    if (!res.ok) return []
    return res.json()
  },
  async updateProfile(data) {
    const res = await fetch('/api/profile', {
      method: 'PUT', headers: jsonHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Ошибка обновления профиля')
    return res.json()
  }
}

function renderProfile(profile) {
  document.getElementById('profile-header').innerHTML = `
    <div class="profile-avatar">${escHtml(profile.initials)}</div>
    <div class="profile-info">
      <h1>${escHtml(profile.name)}</h1>
      <div class="email">${escHtml(profile.email)}</div>
      <div class="bio">${escHtml(profile.bio)}</div>
      <button class="edit-profile-btn">✏️ Редактировать профиль</button>
    <button class="logout-btn" id="logout-btn">🚪 Выйти</button>
    </div>`
}

function renderStats(stats) {
  const items = [
    { value: stats.places, label: '📍 Места' },
    { value: stats.memories, label: '📝 Воспоминания' },
    { value: stats.photos, label: '📸 Фото' },
    { value: stats.videos, label: '🎬 Видео' }
  ]
  document.getElementById('stats-row').innerHTML = items.map(s =>
    `<div class="stat-card"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`
  ).join('')
}

function renderMemories(memories) {
  const container = document.getElementById('memories-list')
  if (!memories.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#bbb">Пока нет воспоминаний</div>'
    return
  }
  container.innerHTML = memories.map(m =>
    `<a href="/memory/?id=${m.id}" class="memory-item">
      <div class="thumb">${m.thumb}</div>
      <div class="info">
        <div class="place-name">${escHtml(m.place)}</div>
        <div class="title">${escHtml(m.title)}</div>
        <div class="excerpt">${escHtml(m.excerpt)}</div>
        <div class="date">📅 ${escHtml(m.date)}</div>
      </div>
    </a>`
  ).join('')
}

async function init() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  if (user.name) document.getElementById('user-avatar').textContent =
    user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  document.getElementById('user-avatar').addEventListener('click', () => { window.location.href = '/profile/' })

  let profile, stats, memories
  try {
    [profile, stats, memories] = await Promise.all([
      API.getProfile(),
      API.getStats(),
      API.getRecentMemories()
    ])
  } catch {}

  if (profile) renderProfile(profile)
  if (stats) renderStats(stats)
  if (memories) renderMemories(memories)

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('user')
    window.location.href = '/auth/'
  })

  document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
    document.getElementById('edit-name').value = profile.name
    document.getElementById('edit-bio').value = profile.bio || ''
    document.getElementById('edit-modal').classList.add('open')
  })

  document.getElementById('edit-cancel')?.addEventListener('click', () => {
    document.getElementById('edit-modal').classList.remove('open')
  })

  document.getElementById('edit-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) {
      document.getElementById('edit-modal').classList.remove('open')
    }
  })

  document.getElementById('edit-form')?.addEventListener('submit', async e => {
    e.preventDefault()
    const name = document.getElementById('edit-name').value.trim()
    const bio = document.getElementById('edit-bio').value.trim()
    if (!name) return
    try {
      const updated = await API.updateProfile({ name, bio })
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      user.name = name
      localStorage.setItem('user', JSON.stringify(user))
      document.getElementById('edit-modal').classList.remove('open')
      if (updated) renderProfile(updated)
    } catch {
      alert('Ошибка обновления профиля')
    }
  })
}

document.addEventListener('DOMContentLoaded', init)

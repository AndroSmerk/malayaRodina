import { jsonHeaders, escHtml } from '../shared/api.js'

const API = {
  async getMembers() {
    const res = await fetch('/api/family/members', { headers: jsonHeaders() })
    if (!res.ok) return []
    return res.json()
  },
  async addMember(email) {
    const res = await fetch('/api/family/members', {
      method: 'POST', headers: jsonHeaders(),
      body: JSON.stringify({ email }),
    })
    if (!res.ok) {
      const body = await res.json()
      throw new Error(body.detail || 'Ошибка')
    }
    return res.json()
  },
  async deleteMember(id) {
    await fetch(`/api/family/members/${id}`, {
      method: 'DELETE', headers: jsonHeaders(),
    })
  },
}

function renderMembers(members) {
  const container = document.getElementById('family-list')
  if (!members.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">👨‍👩‍👧‍👧</div><p>Пока нет родственников в семейном круге</p></div>'
    return
  }
  container.innerHTML = members.map(m =>
    `<div class="member-card" data-id="${m.id}">
      <div class="member-avatar">${escHtml((m.name || '?')[0].toUpperCase())}</div>
      <div class="member-info">
        <div class="member-name">${escHtml(m.name)}</div>
        <div class="member-email">${escHtml(m.email)}</div>
      </div>
      <button class="delete-member" data-id="${m.id}">×</button>
    </div>`
  ).join('')

  container.querySelectorAll('.delete-member').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Убрать родственника из круга?')) {
        await API.deleteMember(Number(btn.dataset.id))
        loadMembers()
      }
    })
  })
}

async function loadMembers() {
  const members = await API.getMembers()
  renderMembers(members)
}

function init() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  if (user.name) document.getElementById('user-avatar').textContent =
    user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  document.getElementById('user-avatar').addEventListener('click', () => { window.location.href = '/profile/' })

  loadMembers()

  document.getElementById('add-relative').addEventListener('click', async () => {
    const email = document.getElementById('relative-email').value.trim()
    const error = document.getElementById('form-error')
    if (!email) return
    try {
      await API.addMember(email)
      document.getElementById('relative-email').value = ''
      error.textContent = ''
      loadMembers()
    } catch (e) {
      error.textContent = e.message
    }
  })
}

document.addEventListener('DOMContentLoaded', init)

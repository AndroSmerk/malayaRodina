import { jsonHeaders, escHtml } from '../shared/api.js'

const API = {
  async getPlace(placeId) {
    const res = await fetch(`/api/places/${placeId}`, { headers: jsonHeaders() })
    if (!res.ok) return { name: 'Место', region: '' }
    const data = await res.json()
    return { id: data.id, name: data.name, region: data.region }
  },
  async getNeighbors(placeId) {
    const res = await fetch(`/api/neighbors/place/${placeId}`, { headers: jsonHeaders() })
    if (!res.ok) return []
    return res.json()
  },
  async saveNeighbor(data) {
    const res = await fetch(`/api/neighbors`, {
      method: 'POST', headers: jsonHeaders(),
      body: JSON.stringify({ ...data, placeId: data.placeId }),
    })
    if (!res.ok) throw new Error('Ошибка сохранения')
    return res.json()
  },
  async deleteNeighbor(id) {
    const res = await fetch(`/api/neighbors/${id}`, {
      method: 'DELETE', headers: jsonHeaders(),
    })
    if (!res.ok) throw new Error('Ошибка удаления')
    return res.json()
  }
}

let state = { placeId: null, place: null, neighbors: [], memories: [] }

const typeIcons = { family: '👩', friend: '👦', default: '👨' }

function renderNeighbors(neighbors) {
  const container = document.getElementById('neighbors-list')
  if (!neighbors.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">👥</div><p>Пока нет добавленных жителей</p></div>'
    return
  }
  container.innerHTML = neighbors.map(n =>
    `<div class="neighbor-card" data-id="${n.id}">
      <div class="neighbor-avatar">${typeIcons[n.type] || '👨'}</div>
      <div class="neighbor-info">
        <div class="name">${escHtml(n.name)}</div>
        <div class="role">${escHtml(n.role)}</div>
        <div class="period">📅 ${escHtml(n.period)}</div>
      </div>
      <div class="neighbor-memories">
        ${n.memories.length
          ? n.memories.map(mId => `<a href="/memory/?id=${mId}&placeId=${state.placeId}" class="memory-dot">📸</a>`).join('')
          : '<span style="font-size:12px;color:#ccc">—</span>'}
      </div>
      <div class="neighbor-actions">
        <button class="delete-neighbor" data-id="${n.id}">×</button>
      </div>
    </div>`
  ).join('')

  container.querySelectorAll('.delete-neighbor').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Удалить жителя?')) {
        await API.deleteNeighbor(Number(btn.dataset.id))
        state.neighbors = state.neighbors.filter(n => n.id !== Number(btn.dataset.id))
        renderNeighbors(state.neighbors)
      }
    })
  })
}

async function init() {
  const params = new URLSearchParams(window.location.search)
  state.placeId = Number(params.get('placeId'))
  if (!state.placeId) {
    document.getElementById('place-ref').textContent = 'Место не указано'
    return
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  if (user.name) document.getElementById('user-avatar').textContent =
    user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  document.getElementById('user-avatar').addEventListener('click', () => { window.location.href = '/profile/' })

  const backLink = document.getElementById('back-link')
  backLink.href = `/place/?id=${state.placeId}`

  state.place = await API.getPlace(state.placeId)
  document.getElementById('place-ref').textContent = `${state.place.name} — ${state.place.region}`

  state.neighbors = await API.getNeighbors(state.placeId)
  renderNeighbors(state.neighbors)

  document.getElementById('show-add-form').addEventListener('click', () => {
    document.getElementById('add-form').classList.add('open')
  })

  document.getElementById('hide-add-form').addEventListener('click', () => {
    document.getElementById('add-form').classList.remove('open')
  })

  document.getElementById('save-neighbor').addEventListener('click', async () => {
    const name = document.getElementById('neighbor-name').value.trim()
    const role = document.getElementById('neighbor-role').value
    const period = document.getElementById('neighbor-period').value.trim()
    if (!name) return
    const newNeighbor = await API.saveNeighbor({ name, role, period, type: 'default', memories: [], placeId: state.placeId })
    state.neighbors.push(newNeighbor)
    renderNeighbors(state.neighbors)
    document.getElementById('add-form').classList.remove('open')
    document.getElementById('neighbor-name').value = ''
    document.getElementById('neighbor-period').value = ''
  })
}

document.addEventListener('DOMContentLoaded', init)

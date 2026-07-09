import { jsonHeaders, escHtml } from '../shared/api.js'

async function load() {
  const u = JSON.parse(localStorage.getItem('user') || '{}')
  if (!u.is_moderator) {
    document.getElementById('pending-memories').innerHTML = '<p>Доступ только модераторам</p>'
    return
  }
  const avatar = document.getElementById('user-avatar')
  if (u.name) avatar.textContent = u.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  avatar.addEventListener('click', () => { window.location.href = '/profile/' })

  const res = await fetch('/api/moderation/pending', { headers: jsonHeaders() })
  if (!res.ok) { document.getElementById('pending-memories').innerHTML = '<p>Ошибка загрузки</p>'; return }
  const data = await res.json()

  const memContainer = document.getElementById('pending-memories')
  if (!data.memories.length) {
    memContainer.innerHTML = '<h2>Истории на проверку</h2><p>Нет ожидающих</p>'
  } else {
    memContainer.innerHTML = '<h2>Истории на проверку</h2>' +
      data.memories.map(m => `
        <div class="mod-item">
          <strong>${escHtml(m.title)}</strong><br>
          <small>${escHtml(m.text)}</small><br>
          <em>видимость: ${m.visibility}</em>
          <div class="mod-actions">
            <button class="btn-approve" data-type="memory" data-id="${m.id}">✓ Одобрить</button>
            <button class="btn-reject" data-type="memory" data-id="${m.id}">✗ Отклонить</button>
          </div>
        </div>
      `).join('')
  }

  const photoContainer = document.getElementById('pending-photos')
  if (!data.photos.length) {
    photoContainer.innerHTML = '<h2>Фото на проверку</h2><p>Нет ожидающих</p>'
  } else {
    photoContainer.innerHTML = '<h2>Фото на проверку</h2>' +
      data.photos.map(p => `
        <div class="mod-item">
          <img src="/${p.file_path}" style="max-width:200px;display:block"><br>
          <div class="mod-actions">
            <button class="btn-approve" data-type="photo" data-id="${p.id}">✓ Одобрить</button>
            <button class="btn-reject" data-type="photo" data-id="${p.id}">✗ Отклонить</button>
          </div>
        </div>
      `).join('')
  }

  document.querySelectorAll('.btn-approve').forEach(b => b.addEventListener('click', action))
  document.querySelectorAll('.btn-reject').forEach(b => b.addEventListener('click', action))
}

async function action(e) {
  const btn = e.currentTarget
  const type = btn.dataset.type
  const id = btn.dataset.id
  const act = btn.classList.contains('btn-approve') ? 'approve' : 'reject'
  const res = await fetch(`/api/moderation/${type}s/${id}/${act}`, { method: 'POST', headers: jsonHeaders() })
  if (res.ok) {
    btn.closest('.mod-item').remove()
  } else {
    alert('Ошибка')
  }
}

document.addEventListener('DOMContentLoaded', load)

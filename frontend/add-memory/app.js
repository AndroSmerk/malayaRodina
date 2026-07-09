import { jsonHeaders, escHtml } from '../shared/api.js'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

const API = {
  async saveMemory(data) {
    const res = await fetch('/api/memories', {
      method: 'POST', headers: jsonHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Ошибка сохранения')
    return res.json()
  },
  async getMemory(id) {
    const res = await fetch('/api/memories/' + id, { headers: jsonHeaders() })
    if (!res.ok) throw new Error('Воспоминание не найдено')
    return res.json()
  },
  async updateMemory(id, data) {
    const res = await fetch('/api/memories/' + id, {
      method: 'PUT', headers: jsonHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Ошибка сохранения')
    return res.json()
  },
}

let state = { placeId: null, editId: null, photos: [], videos: [], quill: null }

function updateCharCount() {
  const text = state.quill ? state.quill.getText().trim() : ''
  document.getElementById('char-count').textContent = text.length
}

function renderPhotoPreviews() {
  const container = document.getElementById('photo-previews')
  container.innerHTML = state.photos.map((_, i) =>
    '<div class="preview-item">📸<button class="remove" data-index="' + i + '">×</button></div>'
  ).join('')
  container.querySelectorAll('.remove').forEach(btn => {
    btn.addEventListener('click', () => {
      state.photos.splice(Number(btn.dataset.index), 1)
      renderPhotoPreviews()
    })
  })
}

function renderVideoPreviews() {
  const container = document.getElementById('video-previews')
  container.innerHTML = state.videos.map((_, i) =>
    '<div class="preview-item">🎬<button class="remove-video" data-index="' + i + '">×</button></div>'
  ).join('')
  container.querySelectorAll('.remove-video').forEach(btn => {
    btn.addEventListener('click', () => {
      state.videos.splice(Number(btn.dataset.index), 1)
      renderVideoPreviews()
    })
  })
}

function init() {
  const params = new URLSearchParams(window.location.search)
  state.placeId = params.get('placeId')
  state.editId = params.get('edit') ? Number(params.get('edit')) : null

  const backLink = document.getElementById('back-link')
  backLink.href = state.placeId ? '/place/?id=' + state.placeId : '/map/'

  const user = JSON.parse(localStorage.getItem('user') || '{}')
  if (user.name) document.getElementById('user-avatar').textContent =
    user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  document.getElementById('user-avatar').addEventListener('click', () => { window.location.href = '/profile/' })

  state.quill = new Quill('#editor', {
    theme: 'snow',
    placeholder: 'Напишите свою историю. Вспомните запахи, звуки, детали и эмоции...',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'code-block'],
        [{ header: [1, 2, 3, false] }],
        ['clean'],
      ],
    },
  })

  state.quill.on('text-change', updateCharCount)

  if (state.editId) {
    document.querySelector('.page-title').textContent = 'Редактирование воспоминания'
    document.querySelector('.btn-primary').textContent = 'Сохранить изменения'
    document.getElementById('photo-upload').style.display = 'none'
    document.getElementById('video-upload').style.display = 'none'

    API.getMemory(state.editId).then(memory => {
      state.placeId = memory.placeId
      backLink.href = '/place/?id=' + memory.placeId

      state.quill.root.innerHTML = memory.text
      updateCharCount()

      if (memory.title) document.getElementById('memory-title').value = memory.title
      if (memory.date) document.getElementById('memory-date').value = memory.date
      if (memory.category) document.getElementById('memory-category').value = memory.category
      if (memory.visibility) document.getElementById('memory-visibility').value = memory.visibility

      if (memory.photos?.length) {
        document.getElementById('photo-previews').innerHTML =
          memory.photos.map(() => '<div class="preview-item">📸</div>').join('')
      }
      if (memory.videos?.length) {
        document.getElementById('video-previews').innerHTML =
          memory.videos.map(() => '<div class="preview-item">🎬</div>').join('')
      }
    }).catch(() => alert('Ошибка загрузки воспоминания'))
  }

  document.getElementById('photo-upload').addEventListener('click', () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.onchange = () => {
      for (const file of input.files) {
        state.photos.push({ id: Date.now(), file })
      }
      renderPhotoPreviews()
    }
    input.click()
  })

  document.getElementById('video-upload').addEventListener('click', () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'video/*'
    input.multiple = true
    input.onchange = () => {
      const maxMB = 100
      for (const file of input.files) {
        if (file.size > maxMB * 1024 * 1024) {
          alert('Видео "' + file.name + '" больше ' + maxMB + 'MB')
          continue
        }
        state.videos.push({ id: Date.now(), file })
      }
      renderVideoPreviews()
    }
    input.click()
  })

  document.getElementById('cancel-btn').addEventListener('click', () => {
    window.location.href = state.placeId ? '/place/?id=' + state.placeId : '/map/'
  })

  document.getElementById('memory-form').addEventListener('submit', async e => {
    e.preventDefault()
    const text = state.quill.root.innerHTML
    if (!state.quill.getText().trim()) { alert('Введите текст'); return }
    const data = {
      placeId: state.placeId,
      text,
      title: document.getElementById('memory-title').value.trim(),
      date: document.getElementById('memory-date').value,
      category: document.getElementById('memory-category').value,
      visibility: document.getElementById('memory-visibility').value,
    }
    try {
      let memory
      if (state.editId) {
        memory = await API.updateMemory(state.editId, data)
      } else {
        memory = await API.saveMemory(data)
        for (const photo of state.photos) {
          if (photo.file) {
            const fd = new FormData()
            fd.append('file', photo.file)
            await fetch('/api/memories/' + memory.id + '/photos', {
              method: 'POST', body: fd,
            })
          }
        }
        for (const video of state.videos) {
          if (video.file) {
            if (video.file.size > 100 * 1024 * 1024) {
              alert('Видео "' + video.file.name + '" больше 100MB')
              continue
            }
            const fd = new FormData()
            fd.append('file', video.file)
            await fetch('/api/memories/' + memory.id + '/videos', {
              method: 'POST', body: fd,
            })
          }
        }
      }
      window.location.href = state.placeId ? '/place/?id=' + state.placeId : '/map/'
    } catch {
      alert('Ошибка сохранения')
    }
  })
}

document.addEventListener('DOMContentLoaded', init)
function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

const API = {
  async saveMemory(data) {
    const res = await fetch(`/api/memories`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Ошибка сохранения');
    return res.json();
  }
};

let state = { placeId: null, photos: [], videos: [], quill: null };

function escHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function updateCharCount() {
  const text = state.quill ? state.quill.getText().trim() : '';
  document.getElementById('char-count').textContent = text.length;
}

function renderPhotoPreviews() {
  const container = document.getElementById('photo-previews');
  container.innerHTML = state.photos.map((_, i) =>
    `<div class="preview-item">📸<button class="remove" data-index="${i}">×</button></div>`
  ).join('');
  container.querySelectorAll('.remove').forEach(btn => {
    btn.addEventListener('click', () => {
      state.photos.splice(Number(btn.dataset.index), 1);
      renderPhotoPreviews();
    });
  });
}

function renderVideoPreviews() {
  const container = document.getElementById('video-previews');
  container.innerHTML = state.videos.map((_, i) =>
    `<div class="preview-item">🎬<button class="remove-video" data-index="${i}">×</button></div>`
  ).join('');
  container.querySelectorAll('.remove-video').forEach(btn => {
    btn.addEventListener('click', () => {
      state.videos.splice(Number(btn.dataset.index), 1);
      renderVideoPreviews();
    });
  });
}

function init() {
  const params = new URLSearchParams(window.location.search);
  state.placeId = params.get('placeId');

  const backLink = document.getElementById('back-link');
  backLink.href = state.placeId ? `../place/index.html?id=${state.placeId}` : '../map/index.html';

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.name) document.getElementById('user-avatar').textContent =
    user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('user-avatar').addEventListener('click', () => { window.location.href = '../profile/index.html'; });

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
  });

  state.quill.on('text-change', updateCharCount);

  document.getElementById('photo-upload').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = () => {
      for (const file of input.files) {
        state.photos.push({ id: Date.now(), file });
      }
      renderPhotoPreviews();
    };
    input.click();
  });

  document.getElementById('video-upload').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.multiple = true;
    input.onchange = () => {
      const maxMB = 100;
      for (const file of input.files) {
        if (file.size > maxMB * 1024 * 1024) {
          alert(`Видео "${file.name}" больше ${maxMB}MB`);
          continue;
        }
        state.videos.push({ id: Date.now(), file });
      }
      renderVideoPreviews();
    };
    input.click();
  });

  document.getElementById('cancel-btn').addEventListener('click', () => {
    window.location.href = state.placeId ? `../place/index.html?id=${state.placeId}` : '../map/index.html';
  });

  document.getElementById('memory-form').addEventListener('submit', async e => {
    e.preventDefault();
    const text = state.quill.root.innerHTML;
    if (!state.quill.getText().trim()) { alert('Введите текст'); return; }
    const data = {
      placeId: state.placeId,
      text,
      title: document.getElementById('memory-title')?.value || state.quill.getText().trim().split('\n')[0].slice(0, 100),
      date: document.getElementById('memory-date').value,
      category: document.getElementById('memory-category').value,
      visibility: document.getElementById('memory-visibility').value,
    };
    try {
      const memory = await API.saveMemory(data);
      for (const photo of state.photos) {
        if (photo.file) {
          const fd = new FormData();
          fd.append('file', photo.file);
          await fetch(`/api/memories/${memory.id}/photos`, {
            method: 'POST', headers: { 'Authorization': authHeaders()['Authorization'] },
            body: fd,
          });
        }
      }
      for (const video of state.videos) {
        if (video.file) {
          if (video.file.size > 100 * 1024 * 1024) {
            alert(`Видео "${video.file.name}" больше 100MB`);
            continue;
          }
          const fd = new FormData();
          fd.append('file', video.file);
          await fetch(`/api/memories/${memory.id}/videos`, {
            method: 'POST', headers: { 'Authorization': authHeaders()['Authorization'] },
            body: fd,
          });
        }
      }
      window.location.href = state.placeId ? `../place/index.html?id=${state.placeId}` : '../map/index.html';
    } catch {
      alert('Ошибка сохранения');
    }
  });
}

document.addEventListener('DOMContentLoaded', init);

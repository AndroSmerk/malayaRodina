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

let state = { placeId: null, photos: [] };

function escHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function updateCharCount() {
  const len = document.getElementById('memory-text').value.length;
  document.getElementById('char-count').textContent = len;
}

function renderPhotoPreviews() {
  const container = document.getElementById('photo-previews');
  container.innerHTML = state.photos.map((_, i) =>
    `<div class="preview-item">
      📸
      <button class="remove" data-index="${i}">×</button>
    </div>`
  ).join('');

  container.querySelectorAll('.remove').forEach(btn => {
    btn.addEventListener('click', () => {
      state.photos.splice(Number(btn.dataset.index), 1);
      renderPhotoPreviews();
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

  document.getElementById('memory-text').addEventListener('input', updateCharCount);

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

  document.getElementById('cancel-btn').addEventListener('click', () => {
    window.location.href = state.placeId ? `../place/index.html?id=${state.placeId}` : '../map/index.html';
  });

  document.getElementById('memory-form').addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      placeId: state.placeId,
      text: document.getElementById('memory-text').value,
      date: document.getElementById('memory-date').value,
      category: document.getElementById('memory-category').value,
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
      window.location.href = state.placeId ? `../place/index.html?id=${state.placeId}` : '../map/index.html';
    } catch {
      alert('Ошибка сохранения');
    }
  });
}

document.addEventListener('DOMContentLoaded', init);

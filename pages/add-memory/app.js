const API = {
  async saveMemory(data) {
    return { id: Date.now(), ...data };
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
    state.photos.push({ id: Date.now() });
    renderPhotoPreviews();
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
      photos: state.photos
    };
    try {
      await API.saveMemory(data);
      window.location.href = state.placeId ? `../place/index.html?id=${state.placeId}` : '../map/index.html';
    } catch {
      alert('Ошибка сохранения');
    }
  });
}

document.addEventListener('DOMContentLoaded', init);

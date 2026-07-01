function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

const API = {
  async getPlace(id) {
    const res = await fetch(`/api/places/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Place not found');
    const data = await res.json();
    data.coords = [data.lat, data.lng];
    return data;
  },
  async getMemories(placeId) {
    const res = await fetch(`/api/memories?place_id=${placeId}`, { headers: authHeaders() });
    if (!res.ok) return [];
    return res.json();
  },
  async getPhotos(placeId) {
    return [];
  },
  async getVideos(placeId) {
    return [];
  }
};

let state = { place: null, memories: [], photos: [], videos: [] };

function escHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function getTypeIcon(type) {
  return { village: '🏘', city: '🏙', house: '🏠' }[type] || '📍';
}

function getTypeLabel(type) {
  return { village: 'деревня', city: 'город', house: 'дом' }[type] || type;
}

function renderHero(place) {
  document.getElementById('place-hero').innerHTML = `
    <div class="place-hero-inner">
      <div class="place-info-section">
        <div class="place-type">${getTypeIcon(place.type)} ${getTypeLabel(place.type).charAt(0).toUpperCase() + getTypeLabel(place.type).slice(1)}</div>
        <h1>${escHtml(place.name)}</h1>
        <div class="place-address">${escHtml(place.region)}</div>
        <div class="place-stats">
          <div class="stat"><div class="stat-value">${place.memories}</div><div class="stat-label">воспоминаний</div></div>
          <div class="stat"><div class="stat-value">${place.photos}</div><div class="stat-label">фото</div></div>
          <div class="stat"><div class="stat-value">${place.videos}</div><div class="stat-label">видео</div></div>
          <div class="stat"><div class="stat-value">${place.neighbors}</div><div class="stat-label">соседей</div></div>
        </div>
        <div class="place-actions">
          <a href="../add-memory/index.html?placeId=${place.id}" class="btn-primary">+ Добавить воспоминание</a>
          <a href="../neighbors/index.html?placeId=${place.id}" class="btn-secondary">👥 Соседи</a>
        </div>
      </div>
      <div class="place-map"><div id="mini-map"></div></div>
    </div>`;

  const miniMap = L.map('mini-map', { zoomControl: false, dragging: false, scrollWheelZoom: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '' }).addTo(miniMap);
  L.marker(place.coords).addTo(miniMap);
  miniMap.setView(place.coords, 15);
}

function renderTabs() {
  const tabs = [
    { id: 'memories', label: '📝 Воспоминания' },
    { id: 'photos', label: '📸 Фото' },
    { id: 'videos', label: '🎬 Видео' }
  ];
  const container = document.getElementById('tabs');
  container.innerHTML = tabs.map((t, i) =>
    `<button class="tab ${i === 0 ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`
  ).join('');

  container.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
      document.getElementById('section-' + tab.dataset.tab).classList.add('active');
    });
  });
}

function renderMemories(memories) {
  const container = document.getElementById('section-memories');
  if (!memories.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📝</div><p>Воспоминаний пока нет</p></div>';
    return;
  }
  container.innerHTML = memories.map(m =>
    `<div class="memory-card" data-id="${m.id}">
      <div class="meta">📅 ${escHtml(m.date)} — 🏷 ${escHtml(m.category)}</div>
      <h3>${escHtml(m.title)}</h3>
      <p>${escHtml(m.text)}</p>
      ${m.media.length ? `<div class="media-previews">${m.media.map(md => `<div class="thumb">${md}</div>`).join('')}</div>` : ''}
    </div>`
  ).join('');

  container.querySelectorAll('.memory-card').forEach(el => {
    el.addEventListener('click', () => {
      window.location.href = `../memory/index.html?id=${el.dataset.id}`;
    });
  });
}

function renderPhotos(photos) {
  const container = document.getElementById('section-photos');
  if (!photos.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📸</div><p>Фото пока нет</p></div>';
    return;
  }
  container.innerHTML = `<div class="photo-grid">${photos.map(() => '<div class="photo-item">📸</div>').join('')}</div>`;
}

function renderVideos(videos) {
  const container = document.getElementById('section-videos');
  container.innerHTML = !videos.length
    ? '<div class="empty-state"><div class="icon">🎬</div><p>Видео пока нет</p></div>'
    : '';
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const placeId = Number(params.get('id')) || 3;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.name) document.getElementById('user-avatar').textContent =
    user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  state.place = await API.getPlace(placeId);
  state.memories = await API.getMemories(placeId);
  state.photos = await API.getPhotos(placeId);
  state.videos = await API.getVideos(placeId);

  renderHero(state.place);
  renderTabs();
  renderMemories(state.memories);
  renderPhotos(state.photos);
  renderVideos(state.videos);
}

document.addEventListener('DOMContentLoaded', init);

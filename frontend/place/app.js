import { jsonHeaders, escHtml } from '../shared/api.js'
import { getTypeIcon, getTypeLabel } from '../shared/icons.js'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const API = {
  async getPlace(id) {
    const res = await fetch(`/api/places/${id}`, { headers: jsonHeaders() });
    if (!res.ok) throw new Error('Place not found');
    const data = await res.json();
    data.coords = [data.lat, data.lng];
    return data;
  },
  async getMemories(placeId) {
    const res = await fetch(`/api/memories?place_id=${placeId}`, { headers: jsonHeaders() });
    if (!res.ok) return [];
    return res.json();
  },
  async getPhotos(placeId) {
    const res = await fetch(`/api/places/${placeId}/photos`, { headers: jsonHeaders() });
    if (!res.ok) return [];
    return res.json();
  },
  async getVideos(placeId) {
    const res = await fetch(`/api/places/${placeId}/videos`, { headers: jsonHeaders() });
    if (!res.ok) return [];
    return res.json();
  }
};

let state = { place: null, memories: [], photos: [], videos: [] };

function renderHero(place) {
  let addressParts = [escHtml(place.name)];
  if (place.street_name) addressParts.push(escHtml(place.street_name));
  if (place.building_number) addressParts.push(`д. ${escHtml(place.building_number)}`);
  if (place.apartment_number) addressParts.push(`кв. ${escHtml(place.apartment_number)}`);
  const addressLine = addressParts.join(', ');

  document.getElementById('place-hero').innerHTML = `
    <div class="place-hero-inner">
      <div class="place-info-section">
        <div class="place-type">${getTypeIcon(place.type)} ${getTypeLabel(place.type).charAt(0).toUpperCase() + getTypeLabel(place.type).slice(1)}</div>
        <h1>${addressLine}</h1>
        <div class="place-address">${escHtml(place.region)}</div>
        ${place.period ? `<div class="place-period">📅 ${escHtml(place.period)}</div>` : ''}
        ${place.locality_name ? `<div class="place-locality">🏘 ${escHtml(place.locality_name)}</div>` : ''}
        <div class="place-stats">
          <div class="stat"><div class="stat-value">${place.memories}</div><div class="stat-label">воспоминаний</div></div>
          <div class="stat"><div class="stat-value">${place.photos}</div><div class="stat-label">фото</div></div>
          <div class="stat"><div class="stat-value">${place.videos}</div><div class="stat-label">видео</div></div>
          <div class="stat"><div class="stat-value">${place.neighbors}</div><div class="stat-label">соседей</div></div>
        </div>
        <div class="place-actions">
          <a href="/add-memory/?placeId=${place.id}" class="btn-primary">+ Добавить воспоминание</a>
          <a href="/neighbors/?placeId=${place.id}" class="btn-secondary">👥 Соседи</a>
          <button class="btn-danger" id="delete-place-btn">🗑 Удалить место</button>
        </div>
      </div>
      <div class="place-map"><div id="mini-map"></div></div>
    </div>`;

  const miniMap = L.map('mini-map', { zoomControl: false, dragging: false, scrollWheelZoom: false });
  miniMap.attributionControl.setPrefix(false);
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
  container.innerHTML = memories.map(m => {
    const visIcon = m.visibility === 'public' ? '🌍' : m.visibility === 'family' ? '👨‍👩‍👧‍👧' : '🔒';
    const statusBadge = m.status === 'pending' ? ' ⏳' : m.status === 'rejected' ? ' 🚫' : '';
    const plainText = m.text.replace(/<[^>]*>/g, '').slice(0, 200);
    return `<div class="memory-card" data-id="${m.id}">
      <div class="meta">📅 ${escHtml(m.date)} — 🏷 ${escHtml(m.category)} ${visIcon}${statusBadge}</div>
      <h3>${escHtml(m.title)}</h3>
      <p>${escHtml(plainText)}</p>
      ${m.media.length ? `<div class="media-previews">${m.media.map(url => url.match(/\.(mp4|webm|ogg)$/i) ? `<video src="${escHtml(url)}" class="thumb" muted></video>` : `<img src="${escHtml(url)}" class="thumb">`).join('')}</div>` : ''}
    </div>`;
  }).join('');

  container.querySelectorAll('.memory-card').forEach(el => {
    el.addEventListener('click', () => {
      const placeId = new URLSearchParams(window.location.search).get('id');
      window.location.href = `/memory/?id=${el.dataset.id}${placeId ? `&placeId=${placeId}` : ''}`;
    });
  });
}

function renderPhotos(photos) {
  const container = document.getElementById('section-photos');
  if (!photos.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📸</div><p>Фото пока нет</p></div>';
    return;
  }
  container.innerHTML = `<div class="photo-grid">${photos.map(p =>
    `<div class="photo-item"><img src="${escHtml(p.url)}" alt="photo" style="width:100%;height:100%;object-fit:cover;border-radius:12px;"></div>`
  ).join('')}</div>`;
}

function renderVideos(videos) {
  const container = document.getElementById('section-videos');
  if (!videos.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">🎬</div><p>Видео пока нет</p></div>';
    return;
  }
  container.innerHTML = `<div class="photo-grid">${videos.map(v =>
    `<div class="photo-item"><video src="${escHtml(v.url)}" controls style="width:100%;height:100%;object-fit:cover;border-radius:12px;"></video></div>`
  ).join('')}</div>`;
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const placeId = Number(params.get('id'));
  if (!placeId) {
    document.getElementById('place-card').innerHTML = '<div class="empty-state"><div class="icon">🗺️</div><p>Место не указано</p></div>';
    return;
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.name) document.getElementById('user-avatar').textContent =
    user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('user-avatar').addEventListener('click', () => { window.location.href = '/profile/'; });

  try {
    state.place = await API.getPlace(placeId);
  } catch {}
  try {
    state.memories = await API.getMemories(placeId);
  } catch {}
  try { state.photos = await API.getPhotos(placeId); } catch {}
  try { state.videos = await API.getVideos(placeId); } catch {}

  if (state.place) {
    renderHero(state.place);
    renderTabs();
    renderMemories(state.memories);
    renderPhotos(state.photos);
    renderVideos(state.videos);
  }

  document.getElementById('delete-place-btn')?.addEventListener('click', async () => {
    if (!confirm('Удалить место? Все воспоминания, фото и видео будут безвозвратно удалены.')) return;
    try {
      await fetch(`/api/places/${placeId}`, { method: 'DELETE', headers: jsonHeaders() });
      window.location.href = '/map/';
    } catch { alert('Ошибка удаления'); }
  });
}

document.addEventListener('DOMContentLoaded', init);
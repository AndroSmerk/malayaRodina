const API = {
  async getPlaces() {
    return [
      { id: 1, name: 'Красная Пахра', type: 'village', coords: [55.428, 37.289], photos: 4, neighbors: 2, region: 'Московская область' },
      { id: 2, name: 'Подольск', type: 'city', coords: [55.429, 37.544], photos: 12, videos: 2, region: 'Московская область' },
      { id: 3, name: 'ул. Центральная, д. 15', type: 'house', coords: [55.415, 37.330], photos: 8, neighbors: 5, region: 'Красная Пахра' },
      { id: 4, name: 'Степаньково', type: 'village', coords: [55.382, 37.380], photos: 1, videos: 1, region: 'Московская область' }
    ];
  },
  async searchPlaces(query) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=ru`;
    const res = await fetch(url, { headers: { 'User-Agent': 'MalayaRodina/1.0' } });
    return res.json();
  }
};

let state = { places: [], markers: [], searchTimeout: null };
let map;

function getTypeIcon(type) {
  const icons = { village: '🏘', city: '🏙', house: '🏠' };
  return icons[type] || '📍';
}

function renderPlaces(places) {
  const container = document.getElementById('places-list');
  if (!places.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📍</div><p>Пока нет добавленных мест</p></div>';
    return;
  }
  container.innerHTML = places.map(p =>
    `<div class="place-card" data-id="${p.id}">
      <div class="pin ${p.type}">${getTypeIcon(p.type)}</div>
      <div class="place-info">
        <div class="place-name">${escHtml(p.name)}</div>
        <div class="place-meta">
          <span>📍 ${p.type === 'village' ? 'деревня' : p.type === 'city' ? 'город' : 'дом'}</span>
          ${p.photos ? `<span>📸 ${p.photos} фото</span>` : ''}
          ${p.videos ? `<span>🎬 ${p.videos} видео</span>` : ''}
          ${p.neighbors ? `<span>👤 ${p.neighbors} соседей</span>` : ''}
        </div>
      </div>
    </div>`
  ).join('');

  container.querySelectorAll('.place-card').forEach(el => {
    el.addEventListener('click', () => {
      const id = Number(el.dataset.id);
      const place = state.places.find(p => p.id === id);
      if (place) window.location.href = `../place/index.html?id=${id}`;
    });
  });
}

function addPlaceMarker(place) {
  const marker = L.marker(place.coords).addTo(map);
  marker.bindPopup(`
    <div class="place-popup">
      <h3>${getTypeIcon(place.type)} ${escHtml(place.name)}</h3>
      <div class="address">${escHtml(place.region)}</div>
      <div class="actions">
        <a href="../place/index.html?id=${place.id}" class="btn-primary">Открыть</a>
      </div>
    </div>
  `);
  state.markers.push(marker);
  return marker;
}

function renderSearchResults(results) {
  const container = document.getElementById('search-results');
  if (!results.length) { container.classList.remove('open'); return; }
  container.innerHTML = results.map(r =>
    `<div class="result-item" data-lat="${r.lat}" data-lon="${r.lon}">
      <div class="result-name">${escHtml(r.display_name.split(',')[0])}</div>
      <div>${escHtml(r.display_name.substring(0, 80))}</div>
    </div>`
  ).join('');
  container.classList.add('open');

  container.querySelectorAll('.result-item').forEach(el => {
    el.addEventListener('click', () => {
      const lat = parseFloat(el.dataset.lat);
      const lon = parseFloat(el.dataset.lon);
      container.classList.remove('open');
      map.setView([lat, lon], 15);
    });
  });
}

function escHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

async function init() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const avatar = document.getElementById('user-avatar');
  if (user.name) avatar.textContent = user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  map = L.map('map').setView([55.751244, 37.618423], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OSM</a>',
    maxZoom: 18
  }).addTo(map);

  state.places = await API.getPlaces();
  state.places.forEach(p => addPlaceMarker(p));
  renderPlaces(state.places);

  map.on('click', e => {
    const { lat, lng } = e.latlng;
    const name = prompt('Название места:');
    if (name && name.trim()) {
      const newPlace = { id: Date.now(), name: name.trim(), type: 'village', coords: [lat, lng], photos: 0, region: '' };
      state.places.push(newPlace);
      addPlaceMarker(newPlace);
      renderPlaces(state.places);
      map.setView([lat, lng], 13);
    }
  });

  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', () => {
    clearTimeout(state.searchTimeout);
    const q = searchInput.value.trim();
    if (q.length < 3) { document.getElementById('search-results').classList.remove('open'); return; }
    state.searchTimeout = setTimeout(async () => {
      try {
        const data = await API.searchPlaces(q);
        renderSearchResults(data);
      } catch { document.getElementById('search-results').classList.remove('open'); }
    }, 400);
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) document.getElementById('search-results').classList.remove('open');
  });

  document.querySelectorAll('.fab, #add-place-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = prompt('Название нового места:');
      if (name && name.trim()) {
        const center = map.getCenter();
        const newPlace = { id: Date.now(), name: name.trim(), type: 'village', coords: [center.lat, center.lng], photos: 0, region: '' };
        state.places.push(newPlace);
        addPlaceMarker(newPlace);
        renderPlaces(state.places);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', init);

const map = L.map('map').setView([55.751244, 37.618423], 5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 18,
}).addTo(map);

const places = [];
const markers = [];

function addPlace(lat, lng, name) {
  const place = { id: Date.now(), lat, lng, name };
  places.push(place);

  const marker = L.marker([lat, lng]).addTo(map);
  marker.bindPopup(`<b>${name}</b><br>${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  markers.push(marker);

  renderList();
}

function removePlace(id) {
  const idx = places.findIndex(p => p.id === id);
  if (idx === -1) return;

  map.removeLayer(markers[idx]);
  places.splice(idx, 1);
  markers.splice(idx, 1);
  renderList();
}

function renderList() {
  const list = document.getElementById('places-list');
  list.innerHTML = places.map(p => `
    <li data-id="${p.id}">
      <div>
        <div class="place-name">${escapeHtml(p.name)}</div>
        <div class="place-coords">${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</div>
      </div>
      <button class="remove-btn" data-id="${p.id}">&times;</button>
    </li>
  `).join('');

  list.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      removePlace(Number(btn.dataset.id));
    });
  });

  list.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      const id = Number(li.dataset.id);
      const p = places.find(pl => pl.id === id);
      if (p) map.setView([p.lat, p.lng], 15);
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
let searchTimeout;

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const q = searchInput.value.trim();
  if (q.length < 3) {
    searchResults.classList.remove('open');
    return;
  }
  searchTimeout = setTimeout(() => searchPlaces(q), 400);
});

document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) {
    searchResults.classList.remove('open');
  }
});

async function searchPlaces(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=ru`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'MalayaRodina/1.0' } });
    const data = await res.json();
    renderSearchResults(data);
  } catch {
    searchResults.classList.remove('open');
  }
}

function renderSearchResults(results) {
  if (!results.length) {
    searchResults.classList.remove('open');
    return;
  }
  searchResults.innerHTML = results.map(r => `
    <div class="result-item" data-lat="${r.lat}" data-lon="${r.lon}">
      <div class="result-name">${escapeHtml(r.display_name.split(',')[0])}</div>
      <div class="result-region">${escapeHtml(r.display_name)}</div>
    </div>
  `).join('');
  searchResults.classList.add('open');

  searchResults.querySelectorAll('.result-item').forEach(item => {
    item.addEventListener('click', () => {
      const lat = parseFloat(item.dataset.lat);
      const lon = parseFloat(item.dataset.lon);
      const name = item.querySelector('.result-name').textContent;
      searchResults.classList.remove('open');
      searchInput.value = name;
      map.setView([lat, lon], 15);
      addPlace(lat, lon, name);
    });
  });
}

map.on('click', e => {
  const { lat, lng } = e.latlng;
  const name = prompt('Название места:', 'Моё место');
  if (name && name.trim()) {
    addPlace(lat, lng, name.trim());
  }
});

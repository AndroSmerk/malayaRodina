function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

function escHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

let pendingLat = null;
let pendingLng = null;
let searchTimeouts = {};

const API = {
  async getPlaces() {
    const res = await fetch(`/api/places`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(p => ({ ...p, coords: [p.lat, p.lng] }));
  },
  async createPlace(data) {
    console.log('  → POST /api/places', data);
    const res = await fetch(`/api/places`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('  ← ответ сервера:', res.status, body);
      throw new Error(`Ошибка создания места (${res.status})`);
    }
    const json = await res.json();
    console.log('  ← place created:', json);
    return json;
  },
  async searchPlaces(query) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=ru`;
    const res = await fetch(url, { headers: { 'User-Agent': 'MalayaRodina/1.0' } });
    return res.json();
  },
  async searchLocalities(q) {
    const res = await fetch(`/api/localities?q=${encodeURIComponent(q)}`, { headers: authHeaders() });
    if (!res.ok) return [];
    return res.json();
  },
  async createLocality(data) {
    const res = await fetch(`/api/localities`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Ошибка создания населённого пункта');
    return res.json();
  },
  async searchStreets(localityId, q) {
    const res = await fetch(`/api/streets?locality_id=${localityId}&q=${encodeURIComponent(q)}`, { headers: authHeaders() });
    if (!res.ok) return [];
    return res.json();
  },
  async createStreet(data) {
    const res = await fetch(`/api/streets`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Ошибка создания улицы');
    return res.json();
  },
  async searchBuildings(streetId, q) {
    const res = await fetch(`/api/buildings?street_id=${streetId}&q=${encodeURIComponent(q)}`, { headers: authHeaders() });
    if (!res.ok) return [];
    return res.json();
  },
  async createBuilding(data) {
    const res = await fetch(`/api/buildings`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Ошибка создания дома');
    return res.json();
  },
  async searchApartments(buildingId, q) {
    const res = await fetch(`/api/apartments?building_id=${buildingId}&q=${encodeURIComponent(q)}`, { headers: authHeaders() });
    if (!res.ok) return [];
    return res.json();
  },
  async createApartment(data) {
    const res = await fetch(`/api/apartments`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Ошибка создания квартиры');
    return res.json();
  },
};

const modal = {
  overlay: document.getElementById('modal-overlay'),
  localityInput: document.getElementById('locality-input'),
  localityResults: document.getElementById('locality-results'),
  localityId: document.getElementById('locality-id'),
  localityLat: document.getElementById('locality-lat'),
  localityLng: document.getElementById('locality-lng'),
  localityRegion: document.getElementById('locality-region'),
  localityType: document.getElementById('locality-type'),
  streetStep: document.getElementById('street-step'),
  streetInput: document.getElementById('street-input'),
  streetResults: document.getElementById('street-results'),
  streetId: document.getElementById('street-id'),
  buildingStep: document.getElementById('building-step'),
  buildingInput: document.getElementById('building-input'),
  buildingResults: document.getElementById('building-results'),
  buildingId: document.getElementById('building-id'),
  apartmentStep: document.getElementById('apartment-step'),
  apartmentInput: document.getElementById('apartment-input'),
  apartmentId: document.getElementById('apartment-id'),
  periodInput: document.getElementById('place-period'),
  visibilitySelect: document.getElementById('place-visibility'),
  submitBtn: document.getElementById('modal-submit'),
  closeBtn: document.getElementById('modal-close'),
  cancelBtn: document.getElementById('modal-cancel'),

  open() {
    this.overlay.classList.add('open');
    this.reset();
    setTimeout(() => this.localityInput.focus(), 150);
  },

  close() {
    this.overlay.classList.remove('open');
    pendingLat = null;
    pendingLng = null;
    this.reset();
  },

  reset() {
    this.localityInput.value = '';
    this.localityResults.innerHTML = '';
    this.localityResults.classList.remove('open');
    this.localityId.value = '';
    this.localityLat.value = '';
    this.localityLng.value = '';
    this.localityRegion.value = '';
    this.localityType.value = '';
    this.stepReset('street');
    this.stepReset('building');
    this.stepReset('apartment');
    this.periodInput.value = '';
  },

  stepReset(name) {
    const step = this[`${name}Step`];
    if (step) step.style.display = 'none';
    const input = this[`${name}Input`];
    if (input) input.value = '';
    const results = this[`${name}Results`];
    if (results) { results.innerHTML = ''; results.classList.remove('open'); }
    const id = this[`${name}Id`];
    if (id) id.value = '';
  },

  async searchAndShow(apiMethod, inputEl, resultsEl, idField, stepName, extraParams) {
    const q = inputEl.value.trim();
    if (q.length < 1) { resultsEl.classList.remove('open'); return; }
    clearTimeout(searchTimeouts[stepName]);
    searchTimeouts[stepName] = setTimeout(async () => {
      try {
        const items = await apiMethod(q, extraParams);
        if (!items.length) {
          resultsEl.innerHTML = `<div class="result-item create-new" data-create="true">➕ Создать «${escHtml(q)}»</div>`;
        } else {
          resultsEl.innerHTML = items.map(item =>
            `<div class="result-item" data-id="${item.id}" data-name="${escHtml(item.name || item.number)}">
              ${escHtml(item.name || item.number)}
            </div>`
          ).join('');
        }
        resultsEl.classList.add('open');
        resultsEl.querySelectorAll('.result-item').forEach(el => {
          el.addEventListener('click', () => {
            if (el.dataset.create === 'true') {
              idField.value = '__new__';
              inputEl.dataset.pendingName = q;
            } else {
              idField.value = el.dataset.id;
              inputEl.value = el.dataset.name;
            }
            resultsEl.classList.remove('open');
            advanceStep(stepName);
          });
        });
      } catch { resultsEl.classList.remove('open'); }
    }, 300);
  },
};

function advanceStep(fromStep) {
  if (fromStep === 'locality') {
    modal.streetStep.style.display = 'block';
    setTimeout(() => modal.streetInput.focus(), 100);
  } else if (fromStep === 'street') {
    modal.buildingStep.style.display = 'block';
    setTimeout(() => modal.buildingInput.focus(), 100);
  } else if (fromStep === 'building') {
    modal.apartmentStep.style.display = 'block';
    setTimeout(() => modal.apartmentInput.focus(), 100);
  }
}

modal.closeBtn.addEventListener('click', () => modal.close());
modal.cancelBtn.addEventListener('click', () => modal.close());
modal.overlay.addEventListener('click', e => {
  if (e.target === modal.overlay) modal.close();
});

document.addEventListener('click', e => {
  if (!e.target.closest('.hierarchy-search')) {
    document.querySelectorAll('.hierarchy-results.open').forEach(el => el.classList.remove('open'));
  }
});

modal.localityInput.addEventListener('input', () => {
  modal.localityId.value = '';
  modal.stepReset('street');
  modal.stepReset('building');
  modal.stepReset('apartment');
  modal.searchAndShow(
    (q) => API.searchLocalities(q),
    modal.localityInput, modal.localityResults, modal.localityId, 'locality'
  );
});

modal.streetInput.addEventListener('input', () => {
  modal.streetId.value = '';
  modal.stepReset('building');
  modal.stepReset('apartment');
  const locId = modal.localityId.value;
  if (!locId || locId === '__new__') return;
  modal.searchAndShow(
    (q) => API.searchStreets(Number(locId), q),
    modal.streetInput, modal.streetResults, modal.streetId, 'street'
  );
});

modal.buildingInput.addEventListener('input', () => {
  modal.buildingId.value = '';
  modal.stepReset('apartment');
  const stId = modal.streetId.value;
  if (!stId || stId === '__new__') return;
  modal.searchAndShow(
    (q) => API.searchBuildings(Number(stId), q),
    modal.buildingInput, modal.buildingResults, modal.buildingId, 'building'
  );
});

modal.submitBtn.addEventListener('click', async () => {
  const name = modal.localityInput.value.trim();
  if (!name) { modal.localityInput.focus(); return; }
  if (pendingLat === null || pendingLng === null) return;

  try {
    console.log('[1/5] Создание locality...');
    let localityId = modal.localityId.value;
    if (!localityId || localityId === '__new__') {
      const loc = await API.createLocality({
        name, lat: pendingLat, lng: pendingLng,
        type: 'village', region: '',
      });
      localityId = loc.id;
    } else {
      localityId = Number(localityId);
    }
    console.log('  localityId =', localityId);

    console.log('[2/5] Создание street...');
    let streetId = null;
    const streetName = modal.streetInput.value.trim();
    if (streetName) {
      const sid = modal.streetId.value;
      if (!sid || sid === '__new__') {
        const s = await API.createStreet({ name: streetName, locality_id: localityId });
        streetId = s.id;
      } else {
        streetId = Number(sid);
      }
    }
    console.log('  streetId =', streetId);

    console.log('[3/5] Создание building...');
    let buildingId = null;
    const buildingNumber = modal.buildingInput.value.trim();
    if (buildingNumber && streetId) {
      const bid = modal.buildingId.value;
      if (!bid || bid === '__new__') {
        const b = await API.createBuilding({ number: buildingNumber, lat: pendingLat, lng: pendingLng, street_id: streetId });
        buildingId = b.id;
      } else {
        buildingId = Number(bid);
      }
    }
    console.log('  buildingId =', buildingId);

    let apartmentId = null;
    const apartmentNumber = modal.apartmentInput.value.trim();
    if (apartmentNumber && buildingId) {
      const aid = modal.apartmentId.value;
      if (!aid || aid === '__new__') {
        const a = await API.createApartment({ number: apartmentNumber, building_id: buildingId });
        apartmentId = a.id;
      } else {
        apartmentId = Number(aid);
      }
    }
    console.log('  apartmentId =', apartmentId);

    const placeData = {
      name,
      lat: pendingLat, lng: pendingLng,
      type: 'village', region: '',
      period: modal.periodInput.value.trim(),
      visibility: modal.visibilitySelect.value,
      locality_id: localityId,
      street_id: streetId,
      building_id: buildingId,
      apartment_id: apartmentId,
    };
    console.log('[4/5] Создание place...', placeData);

    const newPlace = await API.createPlace(placeData);
    console.log('  place created:', newPlace);

    console.log('[5/5] Рендер на карте...');
    newPlace.coords = [newPlace.lat, newPlace.lng];
    state.places.push(newPlace);
    applyFilters();
    const zoomLat = pendingLat;
    const zoomLng = pendingLng;
    modal.close();
    if (map.getZoom() < 10) map.setView([zoomLat, zoomLng], 13);
    console.log('  Готово!');
  } catch (e) {
    console.error('Ошибка на шаге:', e);
    console.error('Стек:', e.stack);
    alert('Ошибка: ' + (e.message || e));
  }
});

modal.localityInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const open = modal.localityResults.classList.contains('open');
    const first = modal.localityResults.querySelector('.result-item');
    if (open && first) { first.click(); return; }
    modal.submitBtn.click();
  }
});

let state = { places: [], markers: [], searchTimeout: null, filter: { types: ['village', 'city', 'house'], period: '' } };
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
  container.innerHTML = places.map(p => {
    let addr = escHtml(p.name);
    if (p.street_name) addr += `, ${escHtml(p.street_name)}`;
    if (p.building_number) addr += `, д. ${escHtml(p.building_number)}`;
    const visIcon = p.visibility === 'public' ? '🌍' : p.visibility === 'family' ? '👨‍👩‍👧‍👧' : '🔒';
    return `<div class="place-card" data-id="${p.id}">
      <div class="pin ${p.type}">${getTypeIcon(p.type)}</div>
      <div class="place-info">
        <div class="place-name">${addr}</div>
        <div class="place-meta">
          <span>${visIcon}</span>
          <span>📍 ${p.type === 'village' ? 'деревня' : p.type === 'city' ? 'город' : 'дом'}</span>
          ${p.period ? `<span>📅 ${escHtml(p.period)}</span>` : ''}
          ${p.photos ? `<span>📸 ${p.photos} фото</span>` : ''}
          ${p.videos ? `<span>🎬 ${p.videos} видео</span>` : ''}
          ${p.neighbors ? `<span>👤 ${p.neighbors} соседей</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');

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
  let addr = escHtml(place.name);
  if (place.street_name) addr += `, ${escHtml(place.street_name)}`;
  if (place.building_number) addr += `, д. ${escHtml(place.building_number)}`;
  const visIcon = place.visibility === 'public' ? '🌍' : place.visibility === 'family' ? '👨‍👩‍👧‍👧' : '🔒';
  marker.bindPopup(`
    <div class="place-popup">
      <h3>${visIcon} ${getTypeIcon(place.type)} ${addr}</h3>
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

function applyFilters() {
  const filtered = state.places.filter(p => {
    if (!state.filter.types.includes(p.type)) return false;
    if (state.filter.period) {
      const period = (p.period || '').toLowerCase();
      if (!period.includes(state.filter.period.toLowerCase())) return false;
    }
    return true;
  });
  state.markers.forEach(m => map.removeLayer(m));
  state.markers = [];
  filtered.forEach(p => addPlaceMarker(p));
  renderPlaces(filtered);
}

document.addEventListener('change', e => {
  if (e.target.matches('.filter-type')) {
    const vals = [...document.querySelectorAll('.filter-type:checked')].map(el => el.value);
    state.filter.types = vals;
    applyFilters();
  }
});

document.addEventListener('input', e => {
  if (e.target.matches('#filter-period')) {
    state.filter.period = e.target.value;
    applyFilters();
  }
});

async function init() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const avatar = document.getElementById('user-avatar');
  if (user.name) avatar.textContent = user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  avatar.addEventListener('click', () => { window.location.href = '../profile/index.html'; });

  map = L.map('map').setView([55.751244, 37.618423], 5);
  map.attributionControl.setPrefix(false);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OSM</a>',
    maxZoom: 18
  }).addTo(map);

  try {
    state.places = await API.getPlaces();
  } catch {
    try {
      const res = await fetch('/api/public/places');
      if (res.ok) {
        const data = await res.json();
        state.places = data.map(p => ({ ...p, coords: [p.lat, p.lng] }));
      }
    } catch {}
  }
  applyFilters();

  map.on('click', e => {
    pendingLat = e.latlng.lat;
    pendingLng = e.latlng.lng;
    modal.open();
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

}

document.addEventListener('DOMContentLoaded', init);

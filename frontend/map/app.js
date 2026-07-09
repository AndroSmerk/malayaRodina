import { jsonHeaders, escHtml } from '../shared/api.js'
import { TYPE_ICONS, TYPE_LABELS, TYPE_ORDER, getTypeIcon, getTypeLabel } from '../shared/icons.js'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

function detectLocalityType(name) {
  const n = name.toLowerCase().trim()
  if (!n) return null

  const knownCities = [
    'москва', 'санкт-петербург', 'петербург', 'новосибирск', 'екатеринбург',
    'казань', 'нижний новгород', 'челябинск', 'самара', 'омск',
    'ростов-на-дону', 'уфа', 'красноярск', 'воронеж', 'пермь',
    'волгоград', 'краснодар', 'саратов', 'тюмень', 'тольятти',
    'барнаул', 'ижевск', 'хабаровск', 'ульяновск', 'иркутск',
    'ярославль', 'кемерово', 'рязань', 'тула', 'киров',
    'чебоксары', 'калининград', 'курск', 'ставрополь', 'тверь',
    'магнитогорск', 'сочи', 'белгород', 'владимир', 'архангельск',
    'калуга', 'смоленск', 'мурманск', 'владикавказ', 'тамбов',
    'псков', 'кострома', 'новороссийск', 'таганрог', 'махачкала',
    'нальчик', 'петрозаводск', 'саранск', 'йошкар-ола', 'грозный',
    'курган', 'чистополь', 'симферополь', 'севастополь', 'донецк',
    'луганск', 'обнинск', 'подольск', 'балашиха', 'химки',
    'королёв', 'мытищи', 'люберцы', 'коломна', 'серпухов',
    'орехово-зуево', 'сергиев посад', 'долгопрудный', 'реутов',
    'череповец', 'дзержинск', 'орск', 'новочеркасск',
    'рыбинск', 'бийск', 'ангарск', 'прокопьевск', 'нижнекамск',
    'альметьевск', 'лениногорск', 'бугульма', 'елен', 'евпатория',
    'феодосия', 'ялта', 'алушта', 'саки', 'джанкой',
    'бахчисарай', 'бердянск', 'мариуполь', 'мелитополь', 'керчь',
  ]

  if (n.startsWith('дер.') || n.startsWith('деревня ') || n.startsWith('село ') || n.startsWith('с. ') || n.startsWith('д. ')) return 'village'
  if (n.startsWith('город ') || n.endsWith(' город') || n.startsWith('г. ')) return 'city'
  if (n.startsWith('пос.') || n.startsWith('посёлок ') || n.startsWith('пгт ')) return 'town'

  if (/(град|бург|поль|полис|штадт|берг|ханск|цк)$/i.test(n)) return 'city'
  if (/[аеёиоуыэюя](нск|вск|рск)$/i.test(n)) return 'city'

  if (knownCities.includes(n)) return 'city'

  if (/(ово|ево|ино|ыно|ено|ая|яя|ица|цы|овка|евка|инка|ушка|иха|уха|ское|цкое)$/i.test(n)) return 'village'

  return 'village'
}

function updateTypeBadge(type) {
  const badge = document.getElementById('locality-type-badge')
  const icon = document.getElementById('lt-icon')
  const label = document.getElementById('lt-label')
  if (type) {
    badge.style.display = 'inline-flex'
    badge.className = 'locality-type-badge type-' + type
    icon.textContent = TYPE_ICONS[type] || '📍'
    label.textContent = TYPE_LABELS[type] || type
    modal.localityType.value = type
  } else {
    badge.style.display = 'none'
    modal.localityType.value = ''
  }
}

async function renderLocalityResults(q) {
  const personal = await API.searchLocalities(q)

  let external = []
  if (q.length >= 2) {
    external = (await API.searchSettlements(q)).map(s => ({ ...s, id: null, external: true }))
  }

  const seenNames = new Set(personal.map(p => p.name.toLowerCase().trim()))
  const merged = [...personal, ...external.filter(e => !seenNames.has(e.name.toLowerCase().trim()))]

  let html = merged.map(item => {
    if (item.id) {
      return '<div class="result-item" data-id="' + item.id + '" data-name="' + escHtml(item.name) + '" data-type="' + escHtml(item.type) + '">'
        + (TYPE_ICONS[item.type] || '📍') + ' ' + escHtml(item.name)
        + ' <span class="result-type">' + (TYPE_LABELS[item.type] || item.type) + '</span>'
        + '</div>'
    }
    return '<div class="result-item external" data-name="' + escHtml(item.name) + '" data-type="' + escHtml(item.type) + '" data-lat="' + item.lat + '" data-lng="' + item.lng + '" data-region="' + escHtml(item.region) + '">'
      + '🌐 ' + (TYPE_ICONS[item.type] || '📍') + ' ' + escHtml(item.name)
      + (item.region ? ' <span class="result-region">' + escHtml(item.region) + '</span>' : '')
      + ' <span class="result-type">' + (TYPE_LABELS[item.type] || item.type) + '</span>'
      + '</div>'
  }).join('')

  const dt = detectLocalityType(q)
  html += '<div class="result-item create-new" data-create="true">➕ Создать «' + escHtml(q) + '»' + (dt ? ' ' + TYPE_ICONS[dt] : '') + '</div>'

  modal.localityResults.innerHTML = html
  modal.localityResults.classList.add('open')

  modal.localityResults.querySelectorAll('.result-item').forEach(el => {
    el.addEventListener('click', () => {
      if (el.dataset.create === 'true') {
        modal.localityId.value = '__new__'
        modal.localityLat.value = ''
        modal.localityLng.value = ''
        modal.localityRegion.value = ''
      } else {
        modal.localityId.value = el.dataset.id || ''
        modal.localityLat.value = el.dataset.lat || ''
        modal.localityLng.value = el.dataset.lng || ''
        modal.localityRegion.value = el.dataset.region || ''
        modal.localityInput.value = el.dataset.name
        if (el.dataset.type) updateTypeBadge(el.dataset.type)
      }
      modal.localityResults.classList.remove('open')
      advanceStep('locality')
    })
  })
}

let pendingLat = null
let pendingLng = null
let searchTimeouts = {}

const API = {
  async getPlaces() {
    const res = await fetch('/api/places', { headers: jsonHeaders() })
    if (!res.ok) return []
    const data = await res.json()
    return (data.items || data).map(p => ({ ...p, coords: [p.lat, p.lng] }))
  },
  async createPlace(data) {
    const res = await fetch('/api/places', {
      method: 'POST', headers: jsonHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Ошибка создания места')
    return res.json()
  },
  async searchPlaces(query) {
    const url = 'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(query) + '&format=json&limit=5&accept-language=ru'
    const res = await fetch(url, { headers: { 'User-Agent': 'MalayaRodina/1.0' } })
    return res.json()
  },
  async searchLocalities(q) {
    const res = await fetch('/api/localities?q=' + encodeURIComponent(q), { headers: jsonHeaders() })
    if (!res.ok) return []
    return res.json()
  },
  async searchSettlements(q) {
    const res = await fetch('/api/settlements/search?q=' + encodeURIComponent(q))
    if (!res.ok) return []
    return res.json()
  },
  async createLocality(data) {
    const res = await fetch('/api/localities', {
      method: 'POST', headers: jsonHeaders(), body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Ошибка создания населённого пункта')
    return res.json()
  },
  async searchStreets(localityId, q) {
    const res = await fetch('/api/streets?locality_id=' + localityId + '&q=' + encodeURIComponent(q), { headers: jsonHeaders() })
    if (!res.ok) return []
    return res.json()
  },
  async createStreet(data) {
    const res = await fetch('/api/streets', {
      method: 'POST', headers: jsonHeaders(), body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Ошибка создания улицы')
    return res.json()
  },
  async searchBuildings(streetId, q) {
    const res = await fetch('/api/buildings?street_id=' + streetId + '&q=' + encodeURIComponent(q), { headers: jsonHeaders() })
    if (!res.ok) return []
    return res.json()
  },
  async createBuilding(data) {
    const res = await fetch('/api/buildings', {
      method: 'POST', headers: jsonHeaders(), body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Ошибка создания дома')
    return res.json()
  },
  async searchApartments(buildingId, q) {
    const res = await fetch('/api/apartments?building_id=' + buildingId + '&q=' + encodeURIComponent(q), { headers: jsonHeaders() })
    if (!res.ok) return []
    return res.json()
  },
  async createApartment(data) {
    const res = await fetch('/api/apartments', {
      method: 'POST', headers: jsonHeaders(), body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Ошибка создания квартиры')
    return res.json()
  },
  async reverseGeocode(lat, lng) {
    const res = await fetch('/api/settlements/nearest?lat=' + lat + '&lng=' + lng)
    if (!res.ok) return null
    return res.json()
  },
}

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
    this.overlay.classList.add('open')
    this.reset()
    setTimeout(() => this.localityInput.focus(), 150)
    this.findNearestSettlement()
  },

  async findNearestSettlement() {
    if (pendingLat == null || pendingLng == null) return
    try {
      const result = await API.reverseGeocode(pendingLat, pendingLng)
      if (!result || this.localityInput.value.trim()) return
      this.localityInput.value = result.name
      this.localityLat.value = result.lat
      this.localityLng.value = result.lng
      this.localityRegion.value = result.region || ''
      updateTypeBadge(result.type)
      advanceStep('locality')
    } catch {}
  },

  close() {
    this.overlay.classList.remove('open')
    pendingLat = null
    pendingLng = null
    this.reset()
  },

  reset() {
    this.localityInput.value = ''
    this.localityResults.innerHTML = ''
    this.localityResults.classList.remove('open')
    this.localityId.value = ''
    this.localityLat.value = ''
    this.localityLng.value = ''
    this.localityRegion.value = ''
    this.localityType.value = ''
    this.stepReset('street')
    this.stepReset('building')
    this.stepReset('apartment')
    this.periodInput.value = ''
    updateTypeBadge(null)
  },

  stepReset(name) {
    const step = this[name + 'Step']
    if (step) step.style.display = 'none'
    const input = this[name + 'Input']
    if (input) input.value = ''
    const results = this[name + 'Results']
    if (results) { results.innerHTML = ''; results.classList.remove('open') }
    const id = this[name + 'Id']
    if (id) id.value = ''
  },

  async searchAndShow(apiMethod, inputEl, resultsEl, idField, stepName, extraParams, showType) {
    const q = inputEl.value.trim()
    if (q.length < 1) { resultsEl.classList.remove('open'); return }
    clearTimeout(searchTimeouts[stepName])
    searchTimeouts[stepName] = setTimeout(async () => {
      try {
        const items = await apiMethod(q, extraParams)
        if (!items.length) {
          const dt = showType ? detectLocalityType(q) : null
          resultsEl.innerHTML = '<div class="result-item create-new" data-create="true">➕ Создать «' + escHtml(q) + '»' + (dt ? ' ' + TYPE_ICONS[dt] : '') + '</div>'
        } else {
          resultsEl.innerHTML = items.map(item => {
            const typeIcon = (showType && item.type) ? TYPE_ICONS[item.type] + ' ' : ''
            const typeLabel = (showType && item.type) ? '<span class="result-type">' + (TYPE_LABELS[item.type] || item.type) + '</span>' : ''
            return '<div class="result-item" data-id="' + item.id + '" data-name="' + escHtml(item.name || item.number) + '"' + (item.type ? ' data-type="' + item.type + '"' : '') + '>'
              + typeIcon + escHtml(item.name || item.number) + typeLabel
              + '</div>'
          }).join('')
        }
        resultsEl.classList.add('open')
        resultsEl.querySelectorAll('.result-item').forEach(el => {
          el.addEventListener('click', () => {
            if (el.dataset.create === 'true') {
              idField.value = '__new__'
              inputEl.dataset.pendingName = q
            } else {
              idField.value = el.dataset.id
              inputEl.value = el.dataset.name
              if (stepName === 'locality' && el.dataset.type) {
                updateTypeBadge(el.dataset.type)
              }
            }
            resultsEl.classList.remove('open')
            advanceStep(stepName)
          })
        })
      } catch { resultsEl.classList.remove('open') }
    }, 300)
  },
}

function advanceStep(fromStep) {
  if (fromStep === 'locality') {
    modal.streetStep.style.display = 'block'
    setTimeout(() => modal.streetInput.focus(), 100)
  } else if (fromStep === 'street') {
    modal.buildingStep.style.display = 'block'
    setTimeout(() => modal.buildingInput.focus(), 100)
  } else if (fromStep === 'building') {
    modal.apartmentStep.style.display = 'block'
    setTimeout(() => modal.apartmentInput.focus(), 100)
  }
}

modal.closeBtn.addEventListener('click', () => modal.close())
modal.cancelBtn.addEventListener('click', () => modal.close())
modal.overlay.addEventListener('click', e => {
  if (e.target === modal.overlay) modal.close()
})

document.getElementById('locality-type-badge').addEventListener('click', function() {
  const current = modal.localityType.value || 'village'
  const idx = TYPE_ORDER.indexOf(current)
  const next = TYPE_ORDER[(idx + 1) % TYPE_ORDER.length]
  updateTypeBadge(next)
})

document.addEventListener('click', e => {
  if (!e.target.closest('.hierarchy-search')) {
    document.querySelectorAll('.hierarchy-results.open').forEach(el => el.classList.remove('open'))
  }
})

modal.localityInput.addEventListener('input', () => {
  modal.localityId.value = ''
  modal.localityLat.value = ''
  modal.localityLng.value = ''
  modal.localityRegion.value = ''
  modal.stepReset('street')
  modal.stepReset('building')
  modal.stepReset('apartment')

  const q = modal.localityInput.value.trim()
  const detected = detectLocalityType(q)
  updateTypeBadge(detected)

  if (q.length < 1) {
    modal.localityResults.classList.remove('open')
    modal.localityResults.innerHTML = ''
    return
  }

  clearTimeout(searchTimeouts.locality)
  searchTimeouts.locality = setTimeout(async () => {
    try {
      await renderLocalityResults(q)
    } catch {
      modal.localityResults.classList.remove('open')
    }
  }, 600)
})

modal.streetInput.addEventListener('input', () => {
  modal.streetId.value = ''
  modal.stepReset('building')
  modal.stepReset('apartment')
  const locId = modal.localityId.value
  if (!locId || locId === '__new__') return
  modal.searchAndShow(
    (q) => API.searchStreets(Number(locId), q),
    modal.streetInput, modal.streetResults, modal.streetId, 'street'
  )
})

modal.buildingInput.addEventListener('input', () => {
  modal.buildingId.value = ''
  modal.stepReset('apartment')
  const stId = modal.streetId.value
  if (!stId || stId === '__new__') return
  modal.searchAndShow(
    (q) => API.searchBuildings(Number(stId), q),
    modal.buildingInput, modal.buildingResults, modal.buildingId, 'building'
  )
})

modal.submitBtn.addEventListener('click', async () => {
  const name = modal.localityInput.value.trim()
  if (!name) { modal.localityInput.focus(); return }
  if (pendingLat === null || pendingLng === null) return

  try {
    let localityId = modal.localityId.value
    if (!localityId || localityId === '__new__') {
      const loc = await API.createLocality({
        name,
        lat: modal.localityLat.value || pendingLat,
        lng: modal.localityLng.value || pendingLng,
        type: modal.localityType.value || detectLocalityType(name),
        region: modal.localityRegion.value || '',
      })
      localityId = loc.id
    } else {
      localityId = Number(localityId)
    }

    let streetId = null
    const streetName = modal.streetInput.value.trim()
    if (streetName) {
      const sid = modal.streetId.value
      if (!sid || sid === '__new__') {
        const s = await API.createStreet({ name: streetName, locality_id: localityId })
        streetId = s.id
      } else {
        streetId = Number(sid)
      }
    }

    let buildingId = null
    const buildingNumber = modal.buildingInput.value.trim()
    if (buildingNumber && streetId) {
      const bid = modal.buildingId.value
      if (!bid || bid === '__new__') {
        const b = await API.createBuilding({ number: buildingNumber, lat: pendingLat, lng: pendingLng, street_id: streetId })
        buildingId = b.id
      } else {
        buildingId = Number(bid)
      }
    }

    let apartmentId = null
    const apartmentNumber = modal.apartmentInput.value.trim()
    if (apartmentNumber && buildingId) {
      const aid = modal.apartmentId.value
      if (!aid || aid === '__new__') {
        const a = await API.createApartment({ number: apartmentNumber, building_id: buildingId })
        apartmentId = a.id
      } else {
        apartmentId = Number(aid)
      }
    }

    const placeData = {
      name,
      lat: pendingLat, lng: pendingLng,
      type: modal.localityType.value || detectLocalityType(name), region: '',
      period: modal.periodInput.value.trim(),
      visibility: modal.visibilitySelect.value,
      locality_id: localityId,
      street_id: streetId,
      building_id: buildingId,
      apartment_id: apartmentId,
    }

    const newPlace = await API.createPlace(placeData)
    newPlace.coords = [newPlace.lat, newPlace.lng]
    state.places.push(newPlace)
    applyFilters()
    const zoomLat = pendingLat
    const zoomLng = pendingLng
    modal.close()
    if (map.getZoom() < 10) map.setView([zoomLat, zoomLng], 13)
  } catch (e) {
    alert('Ошибка: ' + (e.message || e))
  }
})

modal.localityInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const open = modal.localityResults.classList.contains('open')
    const first = modal.localityResults.querySelector('.result-item')
    if (open && first) { first.click(); return }
    modal.submitBtn.click()
  }
})

let state = { places: [], markers: [], searchTimeout: null, filter: { types: ['village', 'town', 'city', 'district', 'house'], period: '' } }
let map

function renderPlaces(places) {
  const container = document.getElementById('places-list')
  if (!places.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📍</div><p>Пока нет добавленных мест</p></div>'
    return
  }
  container.innerHTML = places.map(p => {
    let addr = escHtml(p.name)
    if (p.street_name) addr += ', ' + escHtml(p.street_name)
    if (p.building_number) addr += ', д. ' + escHtml(p.building_number)
    const visIcon = p.visibility === 'public' ? '🌍' : p.visibility === 'family' ? '👨‍👩‍👧‍👧' : '🔒'
    return '<div class="place-card" data-id="' + p.id + '">'
      + '<div class="pin ' + p.type + '">' + getTypeIcon(p.type) + '</div>'
      + '<div class="place-info">'
      + '<div class="place-name">' + addr + '</div>'
      + '<div class="place-meta">'
      + '<span>' + visIcon + '</span>'
      + '<span>📍 ' + (p.type === 'village' ? 'деревня' : p.type === 'town' ? 'посёлок' : p.type === 'city' ? 'город' : p.type === 'district' ? 'район' : 'дом') + '</span>'
      + (p.period ? '<span>📅 ' + escHtml(p.period) + '</span>' : '')
      + (p.photos ? '<span>📸 ' + p.photos + ' фото</span>' : '')
      + (p.videos ? '<span>🎬 ' + p.videos + ' видео</span>' : '')
      + (p.neighbors ? '<span>👤 ' + p.neighbors + ' соседей</span>' : '')
      + '</div></div></div>'
  }).join('')

  container.querySelectorAll('.place-card').forEach(el => {
    el.addEventListener('click', () => {
      const id = Number(el.dataset.id)
      const place = state.places.find(p => p.id === id)
      if (place) window.location.href = '/place/?id=' + id
    })
  })
}

function addPlaceMarker(place) {
  const marker = L.marker(place.coords).addTo(map)
  let addr = escHtml(place.name)
  if (place.street_name) addr += ', ' + escHtml(place.street_name)
  if (place.building_number) addr += ', д. ' + escHtml(place.building_number)
  const visIcon = place.visibility === 'public' ? '🌍' : place.visibility === 'family' ? '👨‍👩‍👧‍👧' : '🔒'
  marker.bindPopup(
    '<div class="place-popup">'
    + '<h3>' + visIcon + ' ' + getTypeIcon(place.type) + ' ' + addr + '</h3>'
    + '<div class="address">' + escHtml(place.region) + '</div>'
    + '<div class="actions"><a href="/place/?id=' + place.id + '" class="btn-primary">Открыть</a></div>'
    + '</div>'
  )
  state.markers.push(marker)
  return marker
}

function renderSearchResults(results) {
  const container = document.getElementById('search-results')
  if (!results.length) { container.classList.remove('open'); return }
  container.innerHTML = results.map(r =>
    '<div class="result-item" data-lat="' + r.lat + '" data-lon="' + r.lon + '">'
    + '<div class="result-name">' + escHtml(r.display_name.split(',')[0]) + '</div>'
    + '<div>' + escHtml(r.display_name.substring(0, 80)) + '</div></div>'
  ).join('')
  container.classList.add('open')

  container.querySelectorAll('.result-item').forEach(el => {
    el.addEventListener('click', () => {
      const lat = parseFloat(el.dataset.lat)
      const lon = parseFloat(el.dataset.lon)
      container.classList.remove('open')
      map.setView([lat, lon], 15)
    })
  })
}

function applyFilters() {
  const filtered = state.places.filter(p => {
    if (!state.filter.types.includes(p.type)) return false
    if (state.filter.period) {
      const period = (p.period || '').toLowerCase()
      if (!period.includes(state.filter.period.toLowerCase())) return false
    }
    return true
  })
  state.markers.forEach(m => map.removeLayer(m))
  state.markers = []
  filtered.forEach(p => addPlaceMarker(p))
  renderPlaces(filtered)
}

document.addEventListener('change', e => {
  if (e.target.matches('.filter-type')) {
    const vals = [...document.querySelectorAll('.filter-type:checked')].map(el => el.value)
    state.filter.types = vals
    applyFilters()
  }
})

document.addEventListener('input', e => {
  if (e.target.matches('#filter-period')) {
    state.filter.period = e.target.value
    applyFilters()
  }
})

async function init() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const avatar = document.getElementById('user-avatar')
  if (user.name) avatar.textContent = user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
  avatar.addEventListener('click', () => { window.location.href = '/profile/' })

  map = L.map('map').setView([55.751244, 37.618423], 5)
  map.attributionControl.setPrefix(false)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://openstreetmap.org/copyright">OSM</a>',
    maxZoom: 18
  }).addTo(map)
  map.options.maxBoundsViscosity = 1.0
  map.setMaxBounds([[41.0, 19.0], [82.0, 180.0]])

  try {
    state.places = await API.getPlaces()
  } catch {
    try {
      const res = await fetch('/api/public/places')
      if (res.ok) {
        const data = await res.json()
        state.places = (data.items || data).map(p => ({ ...p, coords: [p.lat, p.lng] }))
      }
    } catch {}
  }
  applyFilters()

  map.on('click', e => {
    pendingLat = e.latlng.lat
    pendingLng = e.latlng.lng
    modal.open()
  })

  const searchInput = document.getElementById('search-input')
  searchInput.addEventListener('input', () => {
    clearTimeout(state.searchTimeout)
    const q = searchInput.value.trim()
    if (q.length < 3) { document.getElementById('search-results').classList.remove('open'); return }
    state.searchTimeout = setTimeout(async () => {
      try {
        const data = await API.searchPlaces(q)
        renderSearchResults(data)
      } catch { document.getElementById('search-results').classList.remove('open') }
    }, 400)
  })

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) document.getElementById('search-results').classList.remove('open')
  })
}

document.addEventListener('DOMContentLoaded', init)
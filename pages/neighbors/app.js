const API = {
  async getPlace(placeId) {
    const places = {
      3: { id: 3, name: 'ул. Центральная, д. 15', region: 'Красная Пахра' }
    };
    return places[placeId] || places[3];
  },
  async getNeighbors(placeId) {
    return [
      { id: 1, name: 'Валентина Степановна', role: 'Соседка', period: '1985–2010', type: 'family', memories: [1] },
      { id: 2, name: 'Серёжка Кузнецов', role: 'Друг детства', period: '1995–2005', type: 'friend', memories: [1, 3] },
      { id: 3, name: 'Дядя Коля', role: 'Сосед', period: '1990–2015', type: 'default', memories: [] },
      { id: 4, name: 'Витька Соколов', role: 'Друг детства', period: '1995–2007', type: 'friend', memories: [3, 1] }
    ];
  },
  async saveNeighbor(data) {
    return { id: Date.now(), ...data };
  },
  async deleteNeighbor(id) {
    return true;
  }
};

let state = { placeId: null, place: null, neighbors: [], memories: [] };

const typeIcons = { family: '👩', friend: '👦', default: '👨' };
const roleColors = { family: 'family', friend: 'friend', default: 'default' };

function escHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function renderNeighbors(neighbors) {
  const container = document.getElementById('neighbors-list');
  if (!neighbors.length) {
    container.innerHTML = '<div class="empty-state"><div class="icon">👥</div><p>Пока нет добавленных жителей</p></div>';
    return;
  }
  container.innerHTML = neighbors.map(n =>
    `<div class="neighbor-card" data-id="${n.id}">
      <div class="neighbor-avatar ${roleColors[n.type] || 'default'}">${typeIcons[n.type] || '👨'}</div>
      <div class="neighbor-info">
        <div class="name">${escHtml(n.name)}</div>
        <div class="role">${escHtml(n.role)}</div>
        <div class="period">📅 ${escHtml(n.period)}</div>
      </div>
      <div class="neighbor-memories">
        ${n.memories.length
          ? n.memories.map(mId => `<a href="../memory/index.html?id=${mId}&placeId=${state.placeId}" class="memory-dot">📸</a>`).join('')
          : '<span style="font-size:12px;color:#ccc">—</span>'}
      </div>
      <div class="neighbor-actions">
        <button class="delete-neighbor" data-id="${n.id}">×</button>
      </div>
    </div>`
  ).join('');

  container.querySelectorAll('.delete-neighbor').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('Удалить жителя?')) {
        await API.deleteNeighbor(Number(btn.dataset.id));
        state.neighbors = state.neighbors.filter(n => n.id !== Number(btn.dataset.id));
        renderNeighbors(state.neighbors);
      }
    });
  });
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  state.placeId = Number(params.get('placeId')) || 3;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.name) document.getElementById('user-avatar').textContent =
    user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  const backLink = document.getElementById('back-link');
  backLink.href = `../place/index.html?id=${state.placeId}`;

  state.place = await API.getPlace(state.placeId);
  document.getElementById('place-ref').textContent = `${state.place.name} — ${state.place.region}`;

  state.neighbors = await API.getNeighbors(state.placeId);
  renderNeighbors(state.neighbors);

  document.getElementById('show-add-form').addEventListener('click', () => {
    document.getElementById('add-form').classList.add('open');
  });

  document.getElementById('hide-add-form').addEventListener('click', () => {
    document.getElementById('add-form').classList.remove('open');
  });

  document.getElementById('save-neighbor').addEventListener('click', async () => {
    const name = document.getElementById('neighbor-name').value.trim();
    const role = document.getElementById('neighbor-role').value;
    const period = document.getElementById('neighbor-period').value.trim();
    if (!name) return;
    const newNeighbor = await API.saveNeighbor({ name, role, period, type: 'default', memories: [] });
    state.neighbors.push(newNeighbor);
    renderNeighbors(state.neighbors);
    document.getElementById('add-form').classList.remove('open');
    document.getElementById('neighbor-name').value = '';
    document.getElementById('neighbor-period').value = '';
  });
}

document.addEventListener('DOMContentLoaded', init);

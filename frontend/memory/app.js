import { jsonHeaders, escHtml } from '../shared/api.js';

const API = {
  async getMemory(id) {
    const res = await fetch(`/api/memories/${id}`, { headers: jsonHeaders() });
    if (!res.ok) throw new Error('Memory not found');
    return res.json();
  },
  async getAdjacentMemories(id) {
    const res = await fetch(`/api/memories/adjacent/${id}`, { headers: jsonHeaders() });
    if (!res.ok) return { prev: null, next: null };
    return res.json();
  },
  async deleteMemory(id) {
    const res = await fetch(`/api/memories/${id}`, {
      method: 'DELETE', headers: jsonHeaders(),
    });
    if (!res.ok) throw new Error('Ошибка удаления');
    return res.json();
  },
  async getNeighbors(memoryId) {
    const res = await fetch(`/api/memories/${memoryId}/neighbors`, { headers: jsonHeaders() });
    if (!res.ok) return [];
    return res.json();
  },
  async linkNeighbor(neighborId, memoryId) {
    await fetch(`/api/neighbors/${neighborId}/link/${memoryId}`, {
      method: 'POST', headers: jsonHeaders(),
    });
  },
  async unlinkNeighbor(neighborId, memoryId) {
    await fetch(`/api/neighbors/${neighborId}/link/${memoryId}`, {
      method: 'DELETE', headers: jsonHeaders(),
    });
  },
};

let state = { memory: null };

function renderMemory(memory) {
  const visIcon = memory.visibility === 'public' ? '🌍' : memory.visibility === 'family' ? '👨‍👩‍👧‍👧' : '🔒';
  const statusBadge = memory.status === 'pending' ? ' ⏳' : memory.status === 'rejected' ? ' 🚫' : '';

  let mediaHtml = '';
  if (memory.photos?.length || memory.videos?.length) {
    const imgs = (memory.photos || []).map(p =>
      `<img src="${escHtml(p.url)}" alt="" class="media-item" loading="lazy">`
    ).join('');
    const vids = (memory.videos || []).map(v =>
      `<video src="${escHtml(v.url)}" controls class="media-item"></video>`
    ).join('');
    mediaHtml = `<div class="memory-media">${imgs}${vids}</div>`;
  }

  document.getElementById('memory-card').innerHTML = `
    <div class="memory-header">
      <div class="meta">
        <span>📅 ${escHtml(memory.date)}</span>
        <span>🏷 ${escHtml(memory.category)}</span>
        <span>${visIcon}${statusBadge}</span>
      </div>
      <h1>${escHtml(memory.title)}</h1>
      <a href="/place/?id=${memory.placeId}" class="location">📍 ${escHtml(memory.placeName)}, ${escHtml(memory.placeRegion)}</a>
    </div>
    ${mediaHtml}
    <div class="memory-text">${memory.text}</div>`;
}

function renderNeighbors(neighbors, memoryId) {
  const container = document.getElementById('memory-neighbors');
  const list = document.getElementById('neighbors-list');
  if (!neighbors.length) { container.style.display = 'none'; return; }
  container.style.display = 'block';
  list.innerHTML = neighbors.map(n =>
    `<span class="neighbor-tag">${escHtml(n.name)} ${n.role ? `(${escHtml(n.role)})` : ''}</span>`
  ).join('');
}

function renderNav(prev, next) {
  const container = document.getElementById('memory-nav');
  const prevHtml = prev
    ? `<a href="?id=${prev}" class="prev">← Предыдущее</a>`
    : '<a style="visibility:hidden"></a>';
  const nextHtml = next
    ? `<a href="?id=${next}" class="next">Следующее →</a>`
    : '<a style="visibility:hidden"></a>';
  container.innerHTML = prevHtml + nextHtml;
}

function init() {
  const params = new URLSearchParams(window.location.search);
  const memoryId = Number(params.get('id'));
  if (!memoryId) {
    document.getElementById('memory-card').innerHTML = '<div class="empty-state"><div class="icon">📝</div><p>Воспоминание не указано</p></div>';
    return;
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.name) document.getElementById('user-avatar').textContent =
    user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  document.getElementById('user-avatar').addEventListener('click', () => { window.location.href = '/profile/'; });

  const backLink = document.getElementById('back-link');
  const placeId = new URLSearchParams(window.location.search).get('placeId');
  backLink.href = placeId ? `/place/?id=${placeId}` : '/my-places/';

  document.getElementById('edit-btn').addEventListener('click', () => {
    window.location.href = `/add-memory/?edit=${memoryId}`;
  });

  document.getElementById('delete-btn').addEventListener('click', async () => {
    if (confirm('Удалить воспоминание?')) {
      try {
        await API.deleteMemory(memoryId);
        const backHref = document.getElementById('back-link').getAttribute('href');
        window.location.href = backHref || '/map/';
      } catch { alert('Ошибка удаления'); }
    }
  });

  API.getMemory(memoryId).then(memory => {
    state.memory = memory;
    renderMemory(memory);
    if (memory.placeId && !placeId) {
      backLink.href = `/place/?id=${memory.placeId}`;
    }
  });

  API.getNeighbors(memoryId).then(neighbors => {
    renderNeighbors(neighbors, memoryId);
  });

  API.getAdjacentMemories(memoryId).then(({ prev, next }) => renderNav(prev, next));
}

document.addEventListener('DOMContentLoaded', init);

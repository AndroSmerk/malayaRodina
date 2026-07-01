function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

const API = {
  async getProfile() {
    const res = await fetch(`/api/profile`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Profile not found');
    return res.json();
  },
  async getStats() {
    const res = await fetch(`/api/profile/stats`, { headers: authHeaders() });
    if (!res.ok) return { places: 0, memories: 0, photos: 0, videos: 0 };
    return res.json();
  },
  async getRecentMemories() {
    const res = await fetch(`/api/profile/memories`, { headers: authHeaders() });
    if (!res.ok) return [];
    return res.json();
  }
};

function escHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function renderProfile(profile) {
  document.getElementById('profile-header').innerHTML = `
    <div class="profile-avatar">${escHtml(profile.initials)}</div>
    <div class="profile-info">
      <h1>${escHtml(profile.name)}</h1>
      <div class="email">${escHtml(profile.email)}</div>
      <div class="bio">${escHtml(profile.bio)}</div>
      <button class="edit-profile-btn">✏️ Редактировать профиль</button>
    </div>`;
}

function renderStats(stats) {
  const items = [
    { value: stats.places, label: '📍 Места' },
    { value: stats.memories, label: '📝 Воспоминания' },
    { value: stats.photos, label: '📸 Фото' },
    { value: stats.videos, label: '🎬 Видео' }
  ];
  document.getElementById('stats-row').innerHTML = items.map(s =>
    `<div class="stat-card"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`
  ).join('');
}

function renderMemories(memories) {
  const container = document.getElementById('memories-list');
  if (!memories.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#bbb">Пока нет воспоминаний</div>';
    return;
  }
  container.innerHTML = memories.map(m =>
    `<a href="../memory/index.html?id=${m.id}" class="memory-item">
      <div class="thumb">${m.thumb}</div>
      <div class="info">
        <div class="place-name">${escHtml(m.place)}</div>
        <div class="title">${escHtml(m.title)}</div>
        <div class="excerpt">${escHtml(m.excerpt)}</div>
        <div class="date">📅 ${escHtml(m.date)}</div>
      </div>
    </a>`
  ).join('');
}

async function init() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.name) document.getElementById('user-avatar').textContent =
    user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  const [profile, stats, memories] = await Promise.all([
    API.getProfile(),
    API.getStats(),
    API.getRecentMemories()
  ]);

  renderProfile(profile);
  renderStats(stats);
  renderMemories(memories);
}

document.addEventListener('DOMContentLoaded', init);

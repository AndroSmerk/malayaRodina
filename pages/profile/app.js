const API = {
  async getProfile() {
    return {
      name: 'Иван Петров',
      email: 'ivan.petrov@example.com',
      bio: 'Люблю вспоминать детство в деревне. Собираю историю своей семьи и родных мест.',
      initials: 'ИП'
    };
  },
  async getStats() {
    return { places: 4, memories: 12, photos: 8, videos: 3 };
  },
  async getRecentMemories() {
    return [
      { id: 1, title: 'Качели во дворе', place: 'ул. Центральная, д. 15', excerpt: 'Помню, как мы с ребятами после школы бежали к качелям...', date: '15 июня 2005', thumb: '📸' },
      { id: 2, title: 'Первое сентября', place: 'ул. Центральная, д. 15', excerpt: 'Мама повела меня в первый класс...', date: '1 сентября 2003', thumb: '🎬' },
      { id: 3, title: 'Речка за огородом', place: 'ул. Центральная, д. 15', excerpt: 'Жара стояла невыносимая...', date: '12 июля 2010', thumb: '📸' }
    ];
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

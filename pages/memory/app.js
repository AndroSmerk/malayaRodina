const API = {
  async getMemory(id) {
    const memories = {
      1: { id: 1, title: 'Качели во дворе', date: '15 июня 2005', category: 'Детство', placeId: 3, placeName: 'ул. Центральная, д. 15', placeRegion: 'Красная Пахра, Московская область',
        text: 'Помню, как мы с ребятами после школы бежали к качелям. Они были старые, скрипучие, но мы их обожали. Дед сделал их ещё в 90-х из толстой цепи и деревянной доски. Сидеть на ней было больно, но мы подкладывали старые подушки.\n\nОсобенно любили качаться вечером, когда солнце садилось за огороды, и небо становилось оранжевым. Казалось, что качели достают до самого неба.\n\nОдин раз Витька так сильно раскачался, что перелетел через перекладину. Хорошо, что упал в крапиву — отделался парой ожогов и маминым выговором.\n\nСейчас тех качелей уже нет. На их месте построили новый дом. Но я каждый раз, когда проезжаю мимо, вспоминаю тот скрип и запах вечерней травы.',
        media: ['📸', '🎬', '📸', '📸'] },
      2: { id: 2, title: 'Первое сентября', date: '1 сентября 2003', category: 'Школа', placeId: 3, placeName: 'ул. Центральная, д. 15', placeRegion: 'Красная Пахра, Московская область',
        text: 'Мама повела меня в первый класс. Я помню запах букетов и как волновался. После линейки весь двор собрался за столом во дворе — отмечали...',
        media: ['🎬'] },
      3: { id: 3, title: 'Речка за огородом', date: '12 июля 2010', category: 'Лето', placeId: 3, placeName: 'ул. Центральная, д. 15', placeRegion: 'Красная Пахра, Московская область',
        text: 'Жара стояла невыносимая, и мы с пацанами бегали на речку. Вода была тёплая-тёплая, а на обратном пути всегда заходили в магазин за газировкой...',
        media: [] }
    };
    return memories[id] || memories[1];
  },
  async getAdjacentMemories(id) {
    const ids = [1, 2, 3];
    const idx = ids.indexOf(Number(id));
    const prev = idx > 0 ? ids[idx - 1] : null;
    const next = idx < ids.length - 1 ? ids[idx + 1] : null;
    return { prev, next };
  }
};

let state = { memory: null };

function escHtml(text) {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function renderMemory(memory) {
  const paragraphs = memory.text.split('\n\n').map(p => `<p>${escHtml(p)}</p>`).join('');

  let mediaHtml = '';
  if (memory.media.length) {
    mediaHtml = `<div class="memory-media">${memory.media.map((m, i) =>
      `<div class="media-item ${m === '🎬' ? 'video' : ''}">${m}</div>`
    ).join('')}</div>`;
  }

  document.getElementById('memory-card').innerHTML = `
    <div class="memory-header">
      <div class="meta">
        <span>📅 ${escHtml(memory.date)}</span>
        <span>🏷 ${escHtml(memory.category)}</span>
      </div>
      <h1>${escHtml(memory.title)}</h1>
      <a href="../place/index.html?id=${memory.placeId}" class="location">📍 ${escHtml(memory.placeName)}, ${escHtml(memory.placeRegion)}</a>
    </div>
    ${mediaHtml}
    <div class="memory-text">${paragraphs}</div>`;
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
  const memoryId = Number(params.get('id')) || 1;

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (user.name) document.getElementById('user-avatar').textContent =
    user.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  const backLink = document.getElementById('back-link');
  const placeId = new URLSearchParams(window.location.search).get('placeId');
  backLink.href = placeId ? `../place/index.html?id=${placeId}` : '../place/index.html?id=3';

  document.getElementById('edit-btn').addEventListener('click', () => {
    window.location.href = `../add-memory/index.html?edit=${memoryId}`;
  });

  document.getElementById('delete-btn').addEventListener('click', () => {
    if (confirm('Удалить воспоминание?')) window.location.href = '../map/index.html';
  });

  API.getMemory(memoryId).then(memory => {
    state.memory = memory;
    renderMemory(memory);
  });

  API.getAdjacentMemories(memoryId).then(({ prev, next }) => renderNav(prev, next));
}

document.addEventListener('DOMContentLoaded', init);

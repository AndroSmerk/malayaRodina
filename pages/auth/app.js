const API = {
  async login(email, password) {
    return { token: 'mock-token', user: { id: 1, name: 'Иван Петров', email } };
  },
  async register(name, email, password) {
    return { token: 'mock-token', user: { id: 1, name, email } };
  }
};

const features = [
  { icon: '🗺️', text: 'Отмечай родные места на интерактивной карте' },
  { icon: '📸', text: 'Загружай фото и видео из личного архива' },
  { icon: '✍️', text: 'Записывай истории и воспоминания' }
];

function renderFeatures() {
  const container = document.getElementById('features');
  container.innerHTML = features.map(f =>
    `<div class="feature">
      <div class="feature-icon">${f.icon}</div>
      <span>${f.text}</span>
    </div>`
  ).join('');
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  document.getElementById('form-login').classList.toggle('hidden', tabName !== 'login');
  document.getElementById('form-register').classList.toggle('hidden', tabName !== 'register');
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  try {
    const res = await API.login(email, password);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    window.location.href = '../map/index.html';
  } catch {
    alert('Ошибка входа');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirm = document.getElementById('register-confirm').value;
  if (password !== confirm) { alert('Пароли не совпадают'); return; }
  try {
    const res = await API.register(name, email, password);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    window.location.href = '../map/index.html';
  } catch {
    alert('Ошибка регистрации');
  }
}

function init() {
  renderFeatures();

  document.querySelectorAll('.tab').forEach(tab =>
    tab.addEventListener('click', () => switchTab(tab.dataset.tab))
  );

  document.getElementById('switch-to-register').addEventListener('click', e => {
    e.preventDefault();
    switchTab('register');
  });

  document.getElementById('switch-to-login').addEventListener('click', e => {
    e.preventDefault();
    switchTab('login');
  });

  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('register-btn').addEventListener('click', handleRegister);
}

document.addEventListener('DOMContentLoaded', init);

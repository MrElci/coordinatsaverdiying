(async () => {
  // Zaten girişli mi?
  try {
    const r = await fetch('/api/me');
    const d = await r.json();
    if (d.user) { window.location.href = 'viewer.html'; return; }
  } catch (e) {}
})();

const form = document.getElementById('loginForm');
const errEl = document.getElementById('err');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errEl.textContent = '';
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    const r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const d = await r.json();
    if (d.ok) {
      window.location.href = 'viewer.html';
    } else {
      errEl.textContent = 'Geçersiz kullanıcı adı veya şifre.';
      document.getElementById('password').value = '';
    }
  } catch (e) {
    errEl.textContent = 'Sunucuya ulaşılamadı.';
  }
});
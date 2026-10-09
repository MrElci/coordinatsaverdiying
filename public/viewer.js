let CURRENT_ID = null;

async function loadMe() {
  const r = await fetch('/api/me');
  const d = await r.json();
  if (!d.user) { window.location.href = '/'; return; }
  document.getElementById('userName').textContent = d.user;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

async function loadRecords() {
  const r = await fetch('/api/records');
  const d = await r.json();
  const desktop = document.getElementById('desktop');
  desktop.innerHTML = '';

  if (!d.records.length) {
    desktop.innerHTML = '<div class="empty">Henüz kayıtlı koordinat yok. Sağ üstteki + butonundan ekleyin.</div>';
    return;
  }

  d.records.forEach(rec => {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.dataset.id = rec.id;

    const hasImg = !!rec.image;
    tile.innerHTML = `
      <div class="frame">
        <div class="frame-inner">
          ${hasImg
            ? `<img src="/api/records/${rec.id}/image" alt="" onerror="this.parentNode.innerHTML='<div class=\\'ph\\'>◈</div>'">`
            : '<div class="ph">◈</div>'}
        </div>
      </div>
      <div class="tile-name" title="${esc(rec.name)}.cor">${esc(rec.name || 'isimsiz')}.cor</div>
    `;
    tile.addEventListener('click', () => openModal(rec.id));
    desktop.appendChild(tile);
  });
}

async function openModal(id) {
  CURRENT_ID = id;
  const r = await fetch('/api/records/' + id);
  const d = await r.json();
  if (!d.id) return;

  document.getElementById('mFileName').textContent = (d.name || 'kayit') + '.cor';
  document.getElementById('mName').textContent = d.name || '—';
  document.getElementById('mDesc').textContent = d.desc || '—';
  document.getElementById('mCoord').textContent = d.coord || '—';

  const imgBox = document.getElementById('mImg');
  if (d.image) {
    imgBox.innerHTML = `<img src="/api/records/${id}/image" alt="">`;
  } else {
    imgBox.innerHTML = `<div class="ph">◈</div>`;
  }

  renderActivity(d.activity || '');
  document.getElementById('modal').classList.add('open');
}

function renderActivity(text) {
  const box = document.getElementById('mAct');
  if (!text || !text.trim()) {
    box.innerHTML = '<span class="placeholder">// henüz aktivite kaydı yok</span>';
  } else {
    box.textContent = text;
  }
}

document.getElementById('modalClose').addEventListener('click', () => {
  document.getElementById('modal').classList.remove('open');
  CURRENT_ID = null;
});

document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') {
    document.getElementById('modal').classList.remove('open');
    CURRENT_ID = null;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('modal').classList.remove('open');
    CURRENT_ID = null;
  }
});

document.getElementById('actBtn').addEventListener('click', async () => {
  if (!CURRENT_ID) return;
  const btn = document.getElementById('actBtn');
  btn.disabled = true;
  try {
    const r = await fetch(`/api/records/${CURRENT_ID}/activity`, { method: 'POST' });
    const d = await r.json();
    if (d.ok) renderActivity(d.activity);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
});

(async () => {
  await loadMe();
  await loadRecords();
})();
async function loadMe() {
  const r = await fetch('/api/me');
  const d = await r.json();
  if (!d.user) { window.location.href = '/'; return; }
  document.getElementById('userName').textContent = d.user;
}
loadMe();

const fileInput = document.getElementById('image');
const fileDrop  = document.getElementById('fileDrop');
const fdText    = document.getElementById('fdText');

fileInput.addEventListener('change', () => {
  if (fileInput.files.length) {
    fdText.innerHTML = 'Seçildi: <b>' + fileInput.files[0].name + '</b>';
    fileDrop.classList.add('has-file');
  } else {
    fdText.textContent = 'Bir görsel seç veya buraya bırak';
    fileDrop.classList.remove('has-file');
  }
});

// Basit drag & drop
['dragover','dragenter'].forEach(ev => fileDrop.addEventListener(ev, e => { e.preventDefault(); fileDrop.classList.add('has-file'); }));
['dragleave','drop'].forEach(ev => fileDrop.addEventListener(ev, e => { e.preventDefault(); if(ev==='drop' && e.dataTransfer.files.length){ fileInput.files = e.dataTransfer.files; fileInput.dispatchEvent(new Event('change')); } else if(ev==='dragleave'){ fileDrop.classList.remove('has-file'); } }));

document.getElementById('saveForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('msg');
  msg.textContent = '';
  msg.className = 'form-msg';

  const fd = new FormData();
  fd.append('coord', document.getElementById('coord').value);
  fd.append('name',  document.getElementById('name').value);
  fd.append('desc',  document.getElementById('desc').value);
  if (fileInput.files[0]) fd.append('image', fileInput.files[0]);

  try {
    const r = await fetch('/api/records', { method: 'POST', body: fd });
    const d = await r.json();
    if (d.ok) {
      msg.textContent = 'Kayıt başarıyla oluşturuldu. Viewer\'a yönlendiriliyorsunuz…';
      msg.className = 'form-msg ok';
      setTimeout(() => window.location.href = 'viewer.html', 900);
    } else {
      msg.textContent = d.error || 'Kayıt başarısız.';
      msg.className = 'form-msg err';
    }
  } catch (e) {
    msg.textContent = 'Sunucu hatası.';
    msg.className = 'form-msg err';
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
});
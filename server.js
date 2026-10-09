const express = require('express');
const session = require('express-session');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');

const app       = express();
const ROOT      = __dirname;
const ENV_DIR   = path.join(ROOT, 'env');
const TMP_DIR   = path.join(ROOT, 'tmp');

// Klasörleri hazırla
for (const d of [ENV_DIR, TMP_DIR]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

// Sabit hesaplar
const ACCOUNTS = {
  LavaLeb:  '3169lav3169',
  SandElc:  '7447sand7447',
  MetalGaz: '0660metal0660'
};

// Multer — önce tmp'ye, sonra kayıt klasörüne taşıyoruz
const upload = multer({ dest: TMP_DIR });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'koordinat-saver-di-ying-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' }
}));

// HTML sayfaları için auth koruması
app.use((req, res, next) => {
  if (req.path === '/viewer.html' || req.path === '/newsave.html') {
    if (!req.session.user) return res.redirect('/');
  }
  next();
});

app.use(express.static(path.join(ROOT, 'public')));

// ---- Yardımcılar ----
function requireAuth(req, res, next) {
  if (req.session.user) return next();
  return res.status(401).json({ ok: false, error: 'auth' });
}

function readDat(id) {
  const p = path.join(ENV_DIR, id, 'dat.txt');
  if (!fs.existsSync(p)) return null;
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  return {
    coord: (lines[0] || '').trim(),
    name:  (lines[1] || '').trim(),
    desc:  (lines[2] || '').trim(),
    image: (lines[3] || '').trim()
  };
}

function sanitize(s) { return String(s || '').replace(/[\r\n]+/g, ' ').trim(); }

function listIds() {
  return fs.readdirSync(ENV_DIR)
    .filter(d => /^\d+$/.test(d) && fs.statSync(path.join(ENV_DIR, d)).isDirectory())
    .map(Number)
    .sort((a, b) => a - b);
}

// ---- API ----
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (ACCOUNTS[username] && ACCOUNTS[username] === password) {
    req.session.user = username;
    return res.json({ ok: true });
  }
  return res.json({ ok: false, error: 'Geçersiz kimlik' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

app.get('/api/records', requireAuth, (req, res) => {
  const records = listIds().map(id => {
    const d = readDat(String(id));
    if (!d) return null;
    return { id, ...d };
  }).filter(Boolean);
  res.json({ records });
});

app.get('/api/records/:id', requireAuth, (req, res) => {
  const id = req.params.id;
  if (!/^\d+$/.test(id)) return res.status(400).json({ ok: false });
  const dir = path.join(ENV_DIR, id);
  if (!fs.existsSync(dir)) return res.status(404).json({ ok: false });
  const d = readDat(id);
  const actPath = path.join(dir, 'playeract.txt');
  const activity = fs.existsSync(actPath) ? fs.readFileSync(actPath, 'utf8') : '';
  res.json({ id, ...d, activity });
});

// Görsel servis
app.get('/api/records/:id/image', requireAuth, (req, res) => {
  const id = req.params.id;
  if (!/^\d+$/.test(id)) return res.status(400).end();
  const d = readDat(id);
  if (!d || !d.image) return res.status(404).end();
  const imgPath = path.join(ENV_DIR, id, d.image);
  if (!fs.existsSync(imgPath)) return res.status(404).end();
  res.sendFile(imgPath);
});

// Oyuncu aktivitesine tıkla → gün-saat yaz
app.post('/api/records/:id/activity', requireAuth, (req, res) => {
  const id = req.params.id;
  if (!/^\d+$/.test(id)) return res.status(400).json({ ok: false });
  const dir = path.join(ENV_DIR, id);
  if (!fs.existsSync(dir)) return res.status(404).json({ ok: false });

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const user = req.session.user;
  const line = `[${stamp}] ${user}`;

  const actPath = path.join(dir, 'playeract.txt');
  const prev = fs.existsSync(actPath) ? fs.readFileSync(actPath, 'utf8') : '';
  const next = prev ? prev.replace(/\s*$/, '') + '\n' + line : line;
  fs.writeFileSync(actPath, next);

  res.json({ ok: true, activity: next });
});

// Yeni kayıt
app.post('/api/records', requireAuth, upload.single('image'), (req, res) => {
  const coord = sanitize(req.body.coord);
  const name  = sanitize(req.body.name);
  const desc  = sanitize(req.body.desc);

  if (!coord || !name) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ ok: false, error: 'Koordinat ve isim zorunlu' });
  }

  const ids = listIds();
  const nextId = ids.length ? ids[ids.length - 1] + 1 : 1;
  const dir = path.join(ENV_DIR, String(nextId));
  fs.mkdirSync(dir, { recursive: true });

  let imageName = '';
  if (req.file) {
    const ext = path.extname(req.file.originalname) || '.png';
    imageName = 'gorsel' + ext;
    fs.renameSync(req.file.path, path.join(dir, imageName));
  }

  fs.writeFileSync(
    path.join(dir, 'dat.txt'),
    [coord, name, desc, imageName].join('\n')
  );
  fs.writeFileSync(path.join(dir, 'playeract.txt'), '');

  res.json({ ok: true, id: nextId });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`KoordinatSaver Di Ying → http://localhost:${PORT}`));
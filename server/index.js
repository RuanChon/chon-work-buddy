const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getState, mergeState, FILES_DIR } = require('./db');

const app = express();
app.use(cors());
app.use(express.json({ limit: '30mb' }));

const upload = multer({ dest: FILES_DIR, limits: { fileSize: 30 * 1024 * 1024 } });

// 拉取全量状态（含 rev）
app.get('/api/state', (req, res) => res.json(getState()));

// 同步（合并）状态
app.put('/api/state', (req, res) => {
  try {
    const data = req.body && req.body.data;
    if (!data) return res.status(400).json({ error: 'missing data' });
    res.json(mergeState(data));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// 上传图片 / 语音，返回可访问 URL
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  const ext = path.extname(req.file.originalname) || '';
  const id = crypto.randomUUID() + ext;
  fs.renameSync(req.file.path, path.join(FILES_DIR, id));
  res.json({ url: '/api/files/' + id, id });
});

app.get('/api/files/:id', (req, res) => {
  const p = path.join(FILES_DIR, path.basename(req.params.id));
  if (!fs.existsSync(p)) return res.status(404).end();
  res.sendFile(p);
});

// 生产模式下托管前端静态资源
const DIST = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).end();
    res.sendFile(path.join(DIST, 'index.html'));
  });
}

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log('[chon-work-buddy] server listening on ' + PORT));

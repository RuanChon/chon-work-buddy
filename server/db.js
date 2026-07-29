const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const FILES_DIR = path.join(DATA_DIR, 'files');

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true });
}

const EMPTY = {
  rev: 0,
  data: {
    exams: [],
    practice: [],
    plans: [],
    mistakes: [],
    papers: [],
    checkins: {},
    settings: {},
    _deleted: {
      exams: {},
      practice: {},
      plans: {},
      mistakes: {},
      papers: {}
    }
  }
};

const COLLECTIONS = ['exams', 'practice', 'plans', 'mistakes', 'papers'];

let cache = null;
let writeTimer = null;

function load() {
  if (cache) return cache;
  ensureDirs();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    cache = JSON.parse(raw);
    if (!cache.data) cache = JSON.parse(JSON.stringify(EMPTY));
  } catch {
    cache = JSON.parse(JSON.stringify(EMPTY));
  }
  return cache;
}

function persist() {
  ensureDirs();
  fs.writeFileSync(DB_FILE, JSON.stringify(cache, null, 2));
}

function schedulePersist() {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(persist, 300);
}

function getState() {
  const c = load();
  return { rev: c.rev, data: c.data };
}

// 合并策略：以 id 为键做并集，客户端版本优先（解决多浏览器并发新增/修改）
function mergeState(clientData) {
  const c = load();
  const serverData = c.data;
  const result = JSON.parse(JSON.stringify(serverData));
  result._deleted = {};
  for (const col of COLLECTIONS) {
    const deleted = {
      ...(serverData._deleted?.[col] || {}),
      ...(clientData._deleted?.[col] || {})
    };
    const sMap = new Map((serverData[col] || []).map(x => [x.id, x]));
    for (const item of (clientData[col] || [])) sMap.set(item.id, item);
    for (const id of Object.keys(deleted)) sMap.delete(id);
    result[col] = Array.from(sMap.values());
    result._deleted[col] = deleted;
  }
  result.checkins = { ...(serverData.checkins || {}), ...(clientData.checkins || {}) };
  result.settings = { ...(serverData.settings || {}), ...(clientData.settings || {}) };
  c.data = result;
  c.rev = (c.rev || 0) + 1;
  schedulePersist();
  return { rev: c.rev, data: c.data };
}

module.exports = { getState, mergeState, FILES_DIR };

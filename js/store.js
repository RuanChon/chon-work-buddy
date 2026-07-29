// ===== 数据存储层：localStorage(结构化数据) + IndexedDB(图片/语音 Blob) =====
const KEY = 'gk-workbench-v1';

export const MODULES = ['言语理解', '逻辑推理', '数量关系', '资料分析', '政治与常识', '申论'];

const defaults = {
  exams: [],        // {id, name, type, date}
  practice: [],     // {id, date, module, total, correct}
  longPlans: [],    // {id, text, done}
  dailyPlans: {},   // { 'YYYY-MM-DD': [{id, text, done}] }
  mistakes: [],     // {id, date, module, text, photos:[blobId], audios:[blobId], created}
  checkins: {},     // { 'YYYY-MM-DD': hours }
  papers: [],       // {id, type, name, date, score, full, duration, sections:[{name, score, full, total, correct}], notes}
};

let data = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return Object.assign(structuredClone(defaults), JSON.parse(raw));
  } catch (e) { console.warn('load fail', e); }
  return structuredClone(defaults);
}

export function save() {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getData() { return data; }

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const fmtDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ===== IndexedDB Blob 存储 =====
const DB_NAME = 'gk-blobs', DB_STORE = 'blobs';
let dbPromise = null;

function openDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

export async function putBlob(id, blob) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put({ id, blob });
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}

export async function getBlob(id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const req = db.transaction(DB_STORE).objectStore(DB_STORE).get(id);
    req.onsuccess = () => res(req.result ? req.result.blob : null);
    req.onerror = () => rej(req.error);
  });
}

export async function delBlob(id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}

// 正确率颜色分级
export function rateClass(rate) {
  if (rate >= 80) return 'rate-good';
  if (rate >= 60) return 'rate-mid';
  return 'rate-bad';
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

import { EMPTY_DATA } from './constants.js';
import * as localApi from './api.js';

const SET_KEY = 'cgb_sync';

const DEFAULT_SETTINGS = {
  mode: 'local', // local | github
  github: {
    owner: 'RuanChon',
    repo: 'chon-work-buddy',
    branch: 'main',
    path: 'data/db.json',
    token: ''
  }
};

export function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SET_KEY));
    if (!s) return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    s.github = { ...DEFAULT_SETTINGS.github, ...(s.github || {}) };
    return s;
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }
}

export function saveSettings(s) {
  localStorage.setItem(SET_KEY, JSON.stringify(s));
}

// 多端合并：以 id 做并集，客户端版本优先
export function mergeData(serverData, clientData) {
  const s = serverData || JSON.parse(JSON.stringify(EMPTY_DATA));
  const result = JSON.parse(JSON.stringify(s));
  const collections = ['exams', 'practice', 'plans', 'mistakes', 'papers'];
  for (const col of collections) {
    const sMap = new Map((s[col] || []).map((x) => [x.id, x]));
    for (const it of clientData[col] || []) sMap.set(it.id, it);
    result[col] = Array.from(sMap.values());
  }
  result.checkins = { ...(s.checkins || {}), ...(clientData.checkins || {}) };
  result.settings = { ...(s.settings || {}), ...(clientData.settings || {}) };
  return result;
}

const enc = (s) => btoa(unescape(encodeURIComponent(s)));
const dec = (b) => decodeURIComponent(escape(atob(b)));

function createGithub(cfg) {
  const base = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`;
  const headers = { Authorization: `Bearer ${cfg.token}`, Accept: 'application/vnd.github+json' };
  let sha = null;

  async function getRaw() {
    const r = await fetch(`${base}?ref=${cfg.branch}`, { headers });
    if (r.status === 404) return { rev: null, data: JSON.parse(JSON.stringify(EMPTY_DATA)) };
    if (!r.ok) throw new Error('GitHub 读取失败 ' + r.status);
    const j = await r.json();
    sha = j.sha;
    return { rev: j.sha, data: JSON.parse(dec(j.content)) };
  }

  async function put(data) {
    let latest = null;
    try { latest = await getRaw(); } catch {}
    const merged = latest ? mergeData(latest.data, data) : data;
    const body = {
      message: 'chon-work-buddy sync',
      content: enc(JSON.stringify(merged, null, 2)),
      branch: cfg.branch
    };
    if (sha) body.sha = sha;
    const r = await fetch(base, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error('GitHub 写入失败 ' + r.status);
    const j = await r.json();
    sha = j.content.sha;
    return { rev: j.content.sha, data: merged };
  }

  async function pollRev() {
    try {
      const r = await fetch(`${base}?ref=${cfg.branch}`, { headers });
      if (!r.ok) return sha;
      const j = await r.json();
      sha = j.sha;
      return j.sha;
    } catch {
      return sha;
    }
  }

  function uploadFile(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res({ url: fr.result });
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }

  return { fetchState: getRaw, pushState: put, pollRev, uploadFile };
}

function createLocal() {
  return {
    fetchState: localApi.fetchState,
    pushState: localApi.pushState,
    uploadFile: localApi.uploadFile
  };
}

export function getSync() {
  const s = loadSettings();
  if (s.mode === 'github' && s.github && s.github.token) {
    return { client: createGithub(s.github), mode: 'github' };
  }
  return { client: createLocal(), mode: 'local' };
}

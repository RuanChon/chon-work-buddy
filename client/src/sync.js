import { EMPTY_DATA } from './constants.js';
import * as localApi from './api.js';

const SET_KEY = 'cgb_sync';
const COLLECTIONS = ['exams', 'practice', 'plans', 'mistakes', 'papers'];

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

const emptyData = () => JSON.parse(JSON.stringify(EMPTY_DATA));

// 多端合并：以 id 做并集，客户端版本优先；删除标记在所有设备上优先。
export function mergeData(serverData, clientData) {
  const s = serverData || emptyData();
  const c = clientData || emptyData();
  const result = JSON.parse(JSON.stringify(s));
  result._deleted = {};

  for (const col of COLLECTIONS) {
    const deleted = {
      ...(s._deleted?.[col] || {}),
      ...(c._deleted?.[col] || {})
    };
    const sMap = new Map((s[col] || []).map((x) => [x.id, x]));
    for (const it of c[col] || []) sMap.set(it.id, it);
    for (const id of Object.keys(deleted)) sMap.delete(id);
    result[col] = Array.from(sMap.values());
    result._deleted[col] = deleted;
  }
  result.checkins = { ...(s.checkins || {}), ...(c.checkins || {}) };
  result.dailyPlanStatus = mergeDailyPlanStatus(s.dailyPlanStatus, c.dailyPlanStatus);
  result.settings = { ...(s.settings || {}), ...(c.settings || {}) };
  return result;
}

function mergeDailyPlanStatus(serverStatus = {}, clientStatus = {}) {
  const result = JSON.parse(JSON.stringify(serverStatus || {}));
  for (const [date, clientPlans] of Object.entries(clientStatus || {})) {
    result[date] ||= {};
    for (const [planId, clientValue] of Object.entries(clientPlans || {})) {
      const serverValue = result[date][planId];
      const clientUpdatedAt = Number(clientValue?.updatedAt || 0);
      const serverUpdatedAt = Number(serverValue?.updatedAt || 0);
      if (!serverValue || clientUpdatedAt >= serverUpdatedAt) {
        result[date][planId] = clientValue;
      }
    }
  }
  return result;
}

const enc = (s) => btoa(unescape(encodeURIComponent(s)));

function hashText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function createGithub(cfg) {
  const path = (cfg.path || 'data/db.json')
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  const base = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
  const headers = { Authorization: `Bearer ${cfg.token}`, Accept: 'application/vnd.github+json' };
  const rawHeaders = { ...headers, Accept: 'application/vnd.github.raw+json' };
  let sha = null;

  async function getRaw() {
    // Contents API 的普通 JSON 响应对超过 1 MB 的文件不再返回 content。
    // 使用官方 raw 媒体类型，确保大型 db.json 仍能被完整读取。
    const r = await fetch(`${base}?ref=${encodeURIComponent(cfg.branch)}&v=${Date.now()}`, {
      headers: rawHeaders,
      cache: 'no-store'
    });
    if (r.status === 404) return { rev: null, data: emptyData() };
    if (!r.ok) throw new Error('GitHub 读取失败 ' + r.status);
    const text = await r.text();
    const etag = r.headers.get('etag')?.replace(/^W\//, '').replaceAll('"', '') || hashText(text);
    sha = etag;
    return { rev: etag, data: JSON.parse(text) };
  }

  async function put(data) {
    // 云端读取失败时必须中止，绝不能把本地空数据当成完整数据覆盖仓库。
    const latest = await getRaw();
    const merged = mergeData(latest.data, data);
    if (JSON.stringify(merged) === JSON.stringify(latest.data)) {
      return { rev: latest.rev, data: merged };
    }
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
      const r = await fetch(`${base}?ref=${encodeURIComponent(cfg.branch)}&v=${Date.now()}`, {
        headers,
        cache: 'no-store'
      });
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

function createGithubReadOnly(cfg) {
  const path = (cfg.path || 'data/db.json')
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  const rawUrl = `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${encodeURIComponent(cfg.branch)}/${path}`;
  const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
  let rev = null;
  let pending = null;
  let lastPollAt = 0;

  async function fetchPublic() {
    const response = await fetch(
      `${apiUrl}?ref=${encodeURIComponent(cfg.branch)}&v=${Date.now()}`,
      {
        headers: { Accept: 'application/vnd.github.raw+json' },
        cache: 'no-store'
      }
    );

    if (response.ok) {
      const text = await response.text();
      const etag = response.headers.get('etag')?.replace(/^W\//, '').replaceAll('"', '') || hashText(text);
      return { rev: etag, data: JSON.parse(text) };
    }

    // 未认证 API 额度耗尽时回退到公开 raw 文件，保证仍可浏览最近一次数据。
    const fallback = await fetch(`${rawUrl}?v=${Date.now()}`, { cache: 'no-store' });
    if (!fallback.ok) throw new Error(`云端数据读取失败 ${response.status}/${fallback.status}`);
    const text = await fallback.text();
    return { rev: hashText(text), data: JSON.parse(text) };
  }

  async function fetchState() {
    const result = pending || await fetchPublic();
    pending = null;
    rev = result.rev;
    return result;
  }

  async function pollRev() {
    // 未认证 API 每小时额度有限，且数据库包含图片时体积较大，只读模式每 5 分钟检查一次。
    if (Date.now() - lastPollAt < 5 * 60 * 1000) return rev;
    lastPollAt = Date.now();
    const result = await fetchPublic();
    if (result.rev !== rev) pending = result;
    return result.rev;
  }

  async function pushState() {
    throw new Error('当前浏览器未配置 GitHub Token，只能读取云端数据');
  }

  function uploadFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ url: reader.result });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return { fetchState, pushState, pollRev, uploadFile };
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
  const isPublic = typeof location !== 'undefined' && location.hostname.endsWith('github.io');
  if (isPublic) {
    return { client: createGithubReadOnly(s.github || DEFAULT_SETTINGS.github), mode: 'github-readonly' };
  }
  return { client: createLocal(), mode: 'local' };
}

const BASE = '';

export async function fetchState() {
  const r = await fetch(BASE + '/api/state');
  if (!r.ok) throw new Error('fetch state failed');
  return r.json(); // { rev, data }
}

export async function pushState(data) {
  const r = await fetch(BASE + '/api/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });
  if (!r.ok) throw new Error('push state failed');
  return r.json();
}

export async function uploadFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch(BASE + '/api/upload', { method: 'POST', body: fd });
  if (!r.ok) throw new Error('upload failed');
  return r.json(); // { url, id }
}

export async function fetchHotNews() {
  const isPublic = typeof location !== 'undefined' && location.hostname.endsWith('github.io');
  const hourlyVersion = new Date().toISOString().slice(0, 13);
  const url = isPublic
    ? `https://raw.githubusercontent.com/RuanChon/chon-work-buddy/main/data/hot-news.json?v=${hourlyVersion}`
    : BASE + '/api/hot-news';
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('fetch hot news failed');
  return r.json();
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function refreshHotNews({ github, previousGeneratedAt } = {}) {
  const isPublic = typeof location !== 'undefined' && location.hostname.endsWith('github.io');

  if (!isPublic) {
    const r = await fetch(BASE + '/api/hot-news/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });
    if (!r.ok) {
      const detail = await r.json().catch(() => ({}));
      throw new Error(detail.error || '热点重新抓取失败');
    }
    return r.json();
  }

  if (!github?.token) {
    throw new Error('公网刷新需要先在“同步与设置”中配置 GitHub Token');
  }

  const owner = github.owner || 'RuanChon';
  const repo = github.repo || 'chon-work-buddy';
  const branch = github.branch || 'main';
  const headers = {
    Authorization: `Bearer ${github.token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json'
  };
  const dispatch = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/hot-news.yml/dispatches`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ ref: branch })
    }
  );

  if (!dispatch.ok) {
    if (dispatch.status === 403) {
      throw new Error('Token 还需要 Actions: Read and write 权限');
    }
    throw new Error(`云端抓取启动失败（${dispatch.status}）`);
  }

  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/data/hot-news.json`;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await wait(3000);
    const response = await fetch(`${rawUrl}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) continue;
    const result = await response.json();
    if (result.generatedAt && result.generatedAt !== previousGeneratedAt) return result;
  }

  throw new Error('云端抓取超时，请稍后再试');
}

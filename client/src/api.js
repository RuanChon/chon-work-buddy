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
  const url = isPublic
    ? 'https://api.github.com/repos/RuanChon/chon-work-buddy/contents/data/hot-news.json?ref=main'
    : BASE + '/api/hot-news';
  const r = await fetch(url, {
    headers: isPublic ? { Accept: 'application/vnd.github+json' } : undefined,
    cache: 'no-store'
  });
  if (!r.ok) throw new Error('fetch hot news failed');
  const result = await r.json();
  if (!isPublic) return result;
  if (result.encoding !== 'base64' || !result.content) throw new Error('hot news content invalid');
  return JSON.parse(decodeGithubContent(result.content));
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function decodeGithubContent(content) {
  const binary = atob(content.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

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

  // 使用 Contents API 读取工作流提交后的文件。raw.githubusercontent.com
  // 存在 CDN 缓存，即使增加查询参数也可能持续返回旧的 generatedAt。
  const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/data/hot-news.json?ref=${encodeURIComponent(branch)}`;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await wait(3000);
    const response = await fetch(contentsUrl, {
      headers,
      cache: 'no-store'
    });
    if (!response.ok) continue;
    const file = await response.json();
    if (file.encoding !== 'base64' || !file.content) continue;
    const result = JSON.parse(decodeGithubContent(file.content));
    if (result.generatedAt && result.generatedAt !== previousGeneratedAt) return result;
  }

  throw new Error('云端抓取超时，请稍后再试');
}

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

export async function fetchHotNews({ github } = {}) {
  const isPublic = typeof location !== 'undefined' && location.hostname.endsWith('github.io');
  if (!isPublic) {
    const response = await fetch(BASE + '/api/hot-news', { cache: 'no-store' });
    if (!response.ok) throw new Error('fetch hot news failed');
    return response.json();
  }

  const owner = github?.owner || 'RuanChon';
  const repo = github?.repo || 'chon-work-buddy';
  const branch = github?.branch || 'main';
  const apiHeaders = { Accept: 'application/vnd.github+json' };
  if (github?.token) apiHeaders.Authorization = `Bearer ${github.token}`;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/data/hot-news.json?ref=${encodeURIComponent(branch)}`,
      { headers: apiHeaders, cache: 'no-store' }
    );
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    const file = await response.json();
    if (file.encoding !== 'base64' || !file.content) throw new Error('hot news content invalid');
    return JSON.parse(decodeGithubContent(file.content));
  } catch {
    // 未认证的 Contents API 只有较低的频率额度。额度耗尽或网络异常时，
    // 回退到公开原始文件，至少保证首页仍能展示最近一次成功抓取的数据。
    const fallback = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/data/hot-news.json?v=${Date.now()}`,
      { cache: 'no-store' }
    );
    if (!fallback.ok) throw new Error('fetch hot news failed');
    return fallback.json();
  }
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
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await wait(1500);
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

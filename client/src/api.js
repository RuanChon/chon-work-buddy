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

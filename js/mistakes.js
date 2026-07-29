// ===== 错题记录模块：拍照/图片、语音转文字、语音条 =====
import { getData, save, uid, today, esc, MODULES, putBlob, getBlob, delBlob } from './store.js';

let pendingPhotos = [];   // {blobId, url}
let pendingAudios = [];   // {blobId, url, duration}
let recognition = null, recognizing = false;
let mediaRecorder = null, recChunks = [], recStart = 0;

export function initMistakes() {
  document.getElementById('mkDate').value = today();
  document.getElementById('mkModule').innerHTML = MODULES.map(m => `<option>${m}</option>`).join('');
  document.getElementById('mkFilter').innerHTML += MODULES.map(m => `<option>${m}</option>`).join('');
  document.getElementById('mkFilter').onchange = renderList;

  // --- 拍照 / 图片上传 ---
  document.getElementById('mkPhoto').onchange = async (e) => {
    for (const file of e.target.files) {
      const id = uid();
      await putBlob(id, file);
      pendingPhotos.push({ blobId: id, url: URL.createObjectURL(file) });
    }
    e.target.value = '';
    renderPending();
  };

  // --- 语音转文字 (Web Speech API) ---
  document.getElementById('mkSpeechBtn').onclick = toggleSpeech;

  // --- 语音条录音 (MediaRecorder) ---
  document.getElementById('mkRecordBtn').onclick = toggleRecord;

  // --- 保存 ---
  document.getElementById('mkSaveBtn').onclick = () => {
    const text = document.getElementById('mkText').value.trim();
    if (!text && !pendingPhotos.length && !pendingAudios.length) { alert('请填写内容或添加图片/语音'); return; }
    getData().mistakes.unshift({
      id: uid(),
      date: document.getElementById('mkDate').value || today(),
      module: document.getElementById('mkModule').value,
      text,
      photos: pendingPhotos.map(p => p.blobId),
      audios: pendingAudios.map(a => ({ id: a.blobId, duration: a.duration })),
      created: Date.now(),
    });
    save();
    document.getElementById('mkText').value = '';
    pendingPhotos = []; pendingAudios = [];
    renderPending(); renderList();
  };

  renderList();
}

// ---------- 语音转文字 ----------
function toggleSpeech() {
  const btn = document.getElementById('mkSpeechBtn');
  const hint = document.getElementById('mkMediaHint');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { hint.textContent = '当前浏览器不支持语音识别，建议使用 Chrome / Edge'; return; }
  if (recognizing) { recognition.stop(); return; }

  recognition = new SR();
  recognition.lang = 'zh-CN';
  recognition.continuous = true;
  recognition.interimResults = true;
  let base = document.getElementById('mkText').value;

  recognition.onresult = (e) => {
    let finalText = '', interim = '';
    for (let i = 0; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      else interim += e.results[i][0].transcript;
    }
    document.getElementById('mkText').value = base + finalText + interim;
  };
  recognition.onstart = () => {
    recognizing = true;
    btn.textContent = '⏹ 停止识别';
    btn.classList.add('rec-on');
    hint.textContent = '正在聆听，请说话……';
  };
  recognition.onend = () => {
    recognizing = false;
    btn.textContent = '🎙️ 语音转文字';
    btn.classList.remove('rec-on');
    hint.textContent = '';
  };
  recognition.onerror = (e) => { hint.textContent = '识别出错：' + e.error; };
  recognition.start();
}

// ---------- 语音条录音 ----------
async function toggleRecord() {
  const btn = document.getElementById('mkRecordBtn');
  const hint = document.getElementById('mkMediaHint');
  if (mediaRecorder && mediaRecorder.state === 'recording') { mediaRecorder.stop(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => recChunks.push(e.data);
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(recChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      const duration = Math.round((Date.now() - recStart) / 1000);
      const id = uid();
      await putBlob(id, blob);
      pendingAudios.push({ blobId: id, url: URL.createObjectURL(blob), duration });
      btn.textContent = '🔴 录语音条';
      btn.classList.remove('rec-on');
      hint.textContent = '';
      renderPending();
    };
    recStart = Date.now();
    mediaRecorder.start();
    btn.textContent = '⏹ 停止录音';
    btn.classList.add('rec-on');
    hint.textContent = '录音中……再次点击停止';
  } catch (err) {
    hint.textContent = '无法访问麦克风：' + err.message;
  }
}

// ---------- 待保存媒体预览 ----------
function renderPending() {
  const box = document.getElementById('mkPending');
  box.innerHTML =
    pendingPhotos.map((p, i) => `<div class="thumb">
      <img src="${p.url}" data-lb="${p.url}">
      <button class="rm-media" data-kind="photo" data-i="${i}">✕</button></div>`).join('') +
    pendingAudios.map((a, i) => `<div class="thumb">
      <span class="voice-bar" data-url="${a.url}">▶ 语音 ${a.duration}s</span>
      <button class="rm-media" data-kind="audio" data-i="${i}">✕</button></div>`).join('');
  bindMedia(box);
  box.querySelectorAll('.rm-media').forEach(btn => {
    btn.onclick = async () => {
      const i = +btn.dataset.i;
      if (btn.dataset.kind === 'photo') { await delBlob(pendingPhotos[i].blobId); pendingPhotos.splice(i, 1); }
      else { await delBlob(pendingAudios[i].blobId); pendingAudios.splice(i, 1); }
      renderPending();
    };
  });
}

// ---------- 错题列表 ----------
async function renderList() {
  const filter = document.getElementById('mkFilter').value;
  const box = document.getElementById('mkList');
  const items = getData().mistakes.filter(m => !filter || m.module === filter);
  if (!items.length) { box.innerHTML = '<p class="empty">暂无错题记录</p>'; return; }

  const parts = await Promise.all(items.map(async m => {
    const photoHtml = (await Promise.all((m.photos || []).map(async id => {
      const blob = await getBlob(id);
      if (!blob) return '';
      const url = URL.createObjectURL(blob);
      return `<div class="thumb"><img src="${url}" data-lb="${url}"></div>`;
    }))).join('');
    const audioHtml = (await Promise.all((m.audios || []).map(async a => {
      const blob = await getBlob(a.id);
      if (!blob) return '';
      const url = URL.createObjectURL(blob);
      return `<span class="voice-bar" data-url="${url}">▶ 语音 ${a.duration || '?'}s</span>`;
    }))).join('');
    return `<div class="mk-item" data-id="${m.id}">
      <div class="meta">
        <span class="module-tag">${esc(m.module)}</span><span>${m.date}</span>
        <button class="btn danger sm" style="margin-left:auto" data-del="${m.id}">删除</button>
      </div>
      ${m.text ? `<div class="content">${esc(m.text)}</div>` : ''}
      <div class="media-strip">${photoHtml}${audioHtml}</div>
    </div>`;
  }));
  box.innerHTML = parts.join('');
  bindMedia(box);
  box.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('删除这条错题记录？')) return;
      const d = getData();
      const m = d.mistakes.find(x => x.id === btn.dataset.del);
      if (m) {
        for (const id of m.photos || []) await delBlob(id);
        for (const a of m.audios || []) await delBlob(a.id);
      }
      d.mistakes = d.mistakes.filter(x => x.id !== btn.dataset.del);
      save(); renderList();
    };
  });
}

// ---------- 图片放大 & 语音播放 ----------
let curAudio = null;
function bindMedia(root) {
  root.querySelectorAll('img[data-lb]').forEach(img => {
    img.onclick = () => {
      const lb = document.createElement('div');
      lb.className = 'lightbox';
      lb.innerHTML = `<img src="${img.dataset.lb}">`;
      lb.onclick = () => lb.remove();
      document.body.appendChild(lb);
    };
  });
  root.querySelectorAll('.voice-bar').forEach(bar => {
    bar.onclick = () => {
      if (curAudio) { curAudio.pause(); document.querySelectorAll('.voice-bar.playing').forEach(b => b.classList.remove('playing')); }
      curAudio = new Audio(bar.dataset.url);
      bar.classList.add('playing');
      curAudio.onended = () => bar.classList.remove('playing');
      curAudio.play();
    };
  });
}

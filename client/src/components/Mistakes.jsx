import { useState, useRef } from 'react';
import { useStore } from '../useStore.jsx';
import { BOARDS, uid } from '../constants.js';
import * as api from '../api.js';

export default function Mistakes() {
  const { data, apply } = useStore();
  const [board, setBoard] = useState('verbal');
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);
  const [audios, setAudios] = useState([]);
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);

  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  async function onImages(e) {
    const files = [...e.target.files];
    setBusy(true);
    try {
      for (const f of files) {
        const r = await api.uploadFile(f);
        setImages((a) => [...a, { url: r.url }]);
      }
    } catch {
      alert('图片上传失败');
    } finally {
      setBusy(false);
    }
    e.target.value = '';
  }

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'voice.webm', { type: 'audio/webm' });
        try {
          setBusy(true);
          const r = await api.uploadFile(file);
          setAudios((a) => [...a, { url: r.url }]);
        } catch {
          alert('语音上传失败');
        } finally {
          setBusy(false);
        }
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRef.current = mr;
      mr.start();
      setRecording(true);
      let s = 0;
      timerRef.current = setInterval(() => { s++; setRecSec(s); }, 1000);
    } catch {
      alert('无法访问麦克风');
    }
  }
  function stopRec() {
    if (mediaRef.current) {
      mediaRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
      setRecSec(0);
    }
  }

  function voiceToText() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('当前浏览器不支持语音转文字，请使用 Chrome / Edge');
      return;
    }
    const rec = new SR();
    rec.lang = 'zh-CN';
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => setText((t) => t + e.results[0][0].transcript);
    rec.onerror = () => alert('语音识别失败');
    rec.start();
  }

  function submit(e) {
    e.preventDefault();
    if (!text && images.length === 0 && audios.length === 0) return;
    apply((d) => {
      d.mistakes.push({ id: uid(), board, text, images, audios, createdAt: Date.now() });
    });
    setText('');
    setImages([]);
    setAudios([]);
  }
  function del(id) {
    apply((d) => { d.mistakes = d.mistakes.filter((x) => x.id !== id); });
  }

  const list = data.mistakes
    .filter((m) => filter === 'all' || m.board === filter)
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div>
      <form onSubmit={submit} className="mistake-form">
        <div className="row">
          <select value={board} onChange={(e) => setBoard(e.target.value)}>
            {BOARDS.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}
          </select>
          <input type="file" accept="image/*" multiple onChange={onImages} disabled={busy} />
          <button type="button" className="btn" onClick={voiceToText}>🎙️ 语音转文字</button>
          {recording ? (
            <button type="button" className="btn rec" onClick={stopRec}>⏹ 停止 {recSec}s</button>
          ) : (
            <button type="button" className="btn" onClick={startRec}>🎤 录语音条</button>
          )}
        </div>
        <textarea placeholder="错题内容 / 知识点…" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="thumbs">{images.map((im, i) => <img key={i} src={im.url} alt="" className="thumb" />)}</div>
        <div className="audios">{audios.map((a, i) => <audio key={i} src={a.url} controls />)}</div>
        <button className="btn primary" type="submit" disabled={busy}>保存错题</button>
      </form>

      <div className="row filter">
        <button className={filter === 'all' ? 'btn sm active' : 'btn sm'} onClick={() => setFilter('all')}>全部</button>
        {BOARDS.map((b) => (
          <button key={b.key} className={filter === b.key ? 'btn sm active' : 'btn sm'} onClick={() => setFilter(b.key)}>{b.name}</button>
        ))}
      </div>

      <div className="mistake-list">
        {list.length === 0 && <p className="muted">还没有错题</p>}
        {list.map((m) => {
          const b = BOARDS.find((x) => x.key === m.board);
          return (
            <div key={m.id} className="mistake-item">
              <div className="mi-head">
                <span className="tag">{b ? b.name : m.board}</span>
                <span className="muted">{new Date(m.createdAt).toLocaleString()}</span>
              </div>
              {m.text && <p>{m.text}</p>}
              <div className="thumbs">{m.images?.map((im, i) => <img key={i} src={im.url} className="thumb" alt="" />)}</div>
              <div className="audios">{m.audios?.map((a, i) => <audio key={i} src={a.url} controls />)}</div>
              <button className="btn ghost sm" onClick={() => del(m.id)}>删除</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

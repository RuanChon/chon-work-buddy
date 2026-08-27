import { useState } from 'react';
import { loadSettings, saveSettings } from '../sync.js';

export default function Settings({ onClose, onSaved }) {
  const [s, setS] = useState(loadSettings());
  const g = s.github;

  function setG(k, v) {
    setS((p) => ({ ...p, github: { ...p.github, [k]: v } }));
  }

  function save(e) {
    e.preventDefault();
    saveSettings(s);
    if (onSaved) onSaved();
    else onClose && onClose();
  }

  return (
    <div className="settings-panel">
      <div className="settings-head">
        <h3>同步设置</h3>
        <button className="btn ghost sm" onClick={onClose}>关闭</button>
      </div>

      <label className="set-row">
        <span>同步方式</span>
        <select value={s.mode} onChange={(e) => setS((p) => ({ ...p, mode: e.target.value }))}>
          <option value="local">本地服务器（开发用）</option>
          <option value="github">GitHub 仓库（公网共享）</option>
        </select>
      </label>

      {s.mode === 'github' && (
        <div className="set-github">
          <p className="muted">
            把仓库当成共享数据库：数据存于 <code>data/db.json</code>。
            需一个<strong>仅限本仓库</strong>的 Fine-grained PAT（Contents 和 Actions 均为 Read &amp; Write）。
            未填写 Token 时仍可读取云端历史数据；填写后才能修改并同步。令牌只保存在当前浏览器，不会上传。
          </p>
          <label className="set-row"><span>Owner</span><input value={g.owner} onChange={(e) => setG('owner', e.target.value)} /></label>
          <label className="set-row"><span>Repo</span><input value={g.repo} onChange={(e) => setG('repo', e.target.value)} /></label>
          <label className="set-row"><span>Branch</span><input value={g.branch} onChange={(e) => setG('branch', e.target.value)} /></label>
          <label className="set-row"><span>Path</span><input value={g.path} onChange={(e) => setG('path', e.target.value)} /></label>
          <label className="set-row"><span>Token</span><input type="password" value={g.token} placeholder="github_pat_xxx" onChange={(e) => setG('token', e.target.value)} /></label>
        </div>
      )}

      <button className="btn primary" type="button" onClick={save}>保存设置</button>
    </div>
  );
}

// ===== 考试倒计时模块 =====
import { getData, save, uid, esc, today } from './store.js';

export function initCountdown() {
  const modal = document.getElementById('examModal');
  document.getElementById('addExamBtn').onclick = () => {
    document.getElementById('exName').value = '';
    document.getElementById('exDate').value = '';
    modal.classList.add('show');
  };
  modal.querySelector('[data-close]').onclick = () => modal.classList.remove('show');
  document.getElementById('exSaveBtn').onclick = () => {
    const name = document.getElementById('exName').value.trim();
    const type = document.getElementById('exType').value;
    const date = document.getElementById('exDate').value;
    if (!name || !date) { alert('请填写考试名称和日期'); return; }
    getData().exams.push({ id: uid(), name, type, date });
    save();
    modal.classList.remove('show');
    render();
  };
  render();
  // 每分钟刷新一次（跨天时倒计时更新）
  setInterval(render, 60 * 1000);
}

export function render() {
  const box = document.getElementById('examList');
  const exams = [...getData().exams].sort((a, b) => a.date.localeCompare(b.date));
  if (!exams.length) {
    box.innerHTML = '<p class="empty">还没有添加考试，点击右上角「＋ 添加考试」设定国考 / 省考倒计时吧</p>';
    return;
  }
  const now = new Date(today());
  box.innerHTML = exams.map(e => {
    const diff = Math.round((new Date(e.date) - now) / 86400000);
    const cls = diff < 0 ? 'past' : diff <= 30 ? 'near' : '';
    const daysHtml = diff < 0
      ? `<div class="days">已结束 <small>${-diff} 天前</small></div>`
      : diff === 0
        ? '<div class="days">今天！<small>全力以赴</small></div>'
        : `<div class="days">${diff}<small> 天</small></div>`;
    return `<div class="exam-card ${cls}">
      <button class="del" data-id="${e.id}">✕</button>
      <span class="tag">${esc(e.type)}</span>
      <h3>${esc(e.name)}</h3>
      <div class="date">📅 ${e.date}</div>
      ${daysHtml}
    </div>`;
  }).join('');
  box.querySelectorAll('.del').forEach(btn => {
    btn.onclick = () => {
      if (!confirm('删除该考试倒计时？')) return;
      const d = getData();
      d.exams = d.exams.filter(x => x.id !== btn.dataset.id);
      save(); render();
    };
  });
}

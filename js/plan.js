// ===== 学习计划 + 每日计划表模块 =====
import { getData, save, uid, today, esc } from './store.js';

export function initPlan() {
  document.getElementById('dailyPlanDate').value = today();
  document.getElementById('dailyPlanDate').onchange = renderDaily;

  document.getElementById('longPlanAdd').onclick = () => {
    const inp = document.getElementById('longPlanInput');
    const text = inp.value.trim();
    if (!text) return;
    getData().longPlans.push({ id: uid(), text, done: false });
    save(); inp.value = ''; renderLong();
  };
  document.getElementById('longPlanInput').onkeydown = e => { if (e.key === 'Enter') document.getElementById('longPlanAdd').click(); };

  document.getElementById('dailyPlanAdd').onclick = () => {
    const inp = document.getElementById('dailyPlanInput');
    const text = inp.value.trim();
    if (!text) return;
    const date = document.getElementById('dailyPlanDate').value;
    const d = getData();
    d.dailyPlans[date] = d.dailyPlans[date] || [];
    d.dailyPlans[date].push({ id: uid(), text, done: false });
    save(); inp.value = ''; renderDaily();
  };
  document.getElementById('dailyPlanInput').onkeydown = e => { if (e.key === 'Enter') document.getElementById('dailyPlanAdd').click(); };

  renderLong();
  renderDaily();
}

function renderLong() {
  const ul = document.getElementById('longPlanList');
  const plans = getData().longPlans;
  ul.innerHTML = plans.length
    ? plans.map(p => `<li class="${p.done ? 'done' : ''}" data-id="${p.id}">
        <span class="txt">${esc(p.text)}</span>
        <button class="rm" title="删除">✕</button></li>`).join('')
    : '<p class="empty">制定你的长期学习计划吧</p>';
  ul.querySelectorAll('li').forEach(li => {
    li.querySelector('.txt').onclick = () => {
      const p = getData().longPlans.find(x => x.id === li.dataset.id);
      p.done = !p.done; save(); renderLong();
    };
    li.querySelector('.rm').onclick = (e) => {
      e.stopPropagation();
      const d = getData();
      d.longPlans = d.longPlans.filter(x => x.id !== li.dataset.id);
      save(); renderLong();
    };
  });
}

function renderDaily() {
  const date = document.getElementById('dailyPlanDate').value;
  const ul = document.getElementById('dailyPlanList');
  const items = getData().dailyPlans[date] || [];
  ul.innerHTML = items.length
    ? items.map(p => `<li class="${p.done ? 'done' : ''}" data-id="${p.id}">
        <span class="txt">${esc(p.text)}</span>
        <button class="rm" title="删除">✕</button></li>`).join('')
    : '<p class="empty">这一天还没有计划，添加一条吧</p>';
  ul.querySelectorAll('li').forEach(li => {
    li.onclick = () => {
      const p = (getData().dailyPlans[date] || []).find(x => x.id === li.dataset.id);
      if (p) { p.done = !p.done; save(); renderDaily(); }
    };
    li.querySelector('.rm').onclick = (e) => {
      e.stopPropagation();
      const d = getData();
      d.dailyPlans[date] = (d.dailyPlans[date] || []).filter(x => x.id !== li.dataset.id);
      save(); renderDaily();
    };
  });
}

// ===== 每日刷题统计模块 =====
import { getData, save, uid, today, fmtDate, rateClass, esc, MODULES } from './store.js';

let chart = null;

export function initPractice() {
  const sel = document.getElementById('pcModule');
  sel.innerHTML = MODULES.map(m => `<option>${m}</option>`).join('');
  document.getElementById('pcDate').value = today();

  document.getElementById('pcAddBtn').onclick = () => {
    const date = document.getElementById('pcDate').value;
    const module = sel.value;
    const total = parseInt(document.getElementById('pcTotal').value, 10);
    const correct = parseInt(document.getElementById('pcCorrect').value, 10);
    if (!date || !total || total <= 0) { alert('请填写日期和做题数'); return; }
    if (isNaN(correct) || correct < 0 || correct > total) { alert('正确数需在 0 ~ 做题数 之间'); return; }
    getData().practice.push({ id: uid(), date, module, total, correct });
    save();
    document.getElementById('pcTotal').value = '';
    document.getElementById('pcCorrect').value = '';
    render();
  };
  render();
}

export function render() {
  renderToday();
  renderModuleStats();
  renderRecords();
  renderChart();
}

function renderToday() {
  const t = today();
  const rows = getData().practice.filter(p => p.date === t);
  const total = rows.reduce((s, p) => s + p.total, 0);
  const correct = rows.reduce((s, p) => s + p.correct, 0);
  const rate = total ? Math.round(correct / total * 100) : 0;
  document.getElementById('pcTodayTitle').textContent = `今日概览（${t}）`;
  document.getElementById('pcTodaySummary').innerHTML = total
    ? `<div class="summary-flex">
        <div class="item"><span class="big-num">${total}</span><p>做题数</p></div>
        <div class="item"><span class="big-num">${correct}</span><p>正确数</p></div>
        <div class="item"><span class="big-num ${rateClass(rate)}">${rate}%</span><p>正确率</p></div>
      </div>`
    : '<p class="empty">今天还没有做题记录，快去刷题吧 💪</p>';
}

function renderModuleStats() {
  const box = document.getElementById('pcModuleStats');
  const agg = {};
  getData().practice.forEach(p => {
    agg[p.module] = agg[p.module] || { total: 0, correct: 0 };
    agg[p.module].total += p.total;
    agg[p.module].correct += p.correct;
  });
  const rows = MODULES.filter(m => agg[m]).map(m => {
    const a = agg[m], rate = Math.round(a.correct / a.total * 100);
    return `<tr><td>${m}</td><td>${a.total}</td><td>${a.correct}</td>
      <td class="${rateClass(rate)}">${rate}%</td></tr>`;
  }).join('');
  box.innerHTML = rows
    ? `<table class="stat-table"><tr><th>板块</th><th>累计做题</th><th>累计正确</th><th>正确率</th></tr>${rows}</table>`
    : '<p class="empty">暂无数据</p>';
}

function renderRecords() {
  const box = document.getElementById('pcRecords');
  const rows = [...getData().practice].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50);
  box.innerHTML = rows.length
    ? `<table class="stat-table"><tr><th>日期</th><th>板块</th><th>做题</th><th>正确</th><th>正确率</th><th></th></tr>` +
      rows.map(p => {
        const rate = Math.round(p.correct / p.total * 100);
        return `<tr><td>${p.date}</td><td>${esc(p.module)}</td><td>${p.total}</td><td>${p.correct}</td>
          <td class="${rateClass(rate)}">${rate}%</td>
          <td><button class="btn danger sm" data-id="${p.id}">删除</button></td></tr>`;
      }).join('') + '</table>'
    : '<p class="empty">暂无记录</p>';
  box.querySelectorAll('button[data-id]').forEach(btn => {
    btn.onclick = () => {
      const d = getData();
      d.practice = d.practice.filter(x => x.id !== btn.dataset.id);
      save(); render();
    };
  });
}

function renderChart() {
  const el = document.getElementById('pcChart');
  if (!window.echarts) { el.innerHTML = '<p class="empty">图表库加载失败（需联网加载 ECharts）</p>'; return; }
  if (!chart) chart = echarts.init(el);
  const days = [], totals = [], rates = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = fmtDate(d);
    const rows = getData().practice.filter(p => p.date === key);
    const t = rows.reduce((s, p) => s + p.total, 0);
    const c = rows.reduce((s, p) => s + p.correct, 0);
    days.push(key.slice(5));
    totals.push(t);
    rates.push(t ? Math.round(c / t * 100) : null);
  }
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['做题数', '正确率'], textStyle: { color: '#26324b' } },
    grid: { left: 45, right: 50, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: days, axisLabel: { color: '#7b869e' } },
    yAxis: [
      { type: 'value', name: '题数', axisLabel: { color: '#7b869e' } },
      { type: 'value', name: '正确率', max: 100, axisLabel: { formatter: '{value}%', color: '#7b869e' } }
    ],
    series: [
      { name: '做题数', type: 'bar', data: totals, itemStyle: { color: '#4f6ef7', borderRadius: [5, 5, 0, 0] }, barMaxWidth: 22 },
      { name: '正确率', type: 'line', yAxisIndex: 1, data: rates, smooth: true, connectNulls: true,
        itemStyle: { color: '#2eb872' }, lineStyle: { width: 2.5 } }
    ]
  });
}

export function resizeCharts() { chart && chart.resize(); }

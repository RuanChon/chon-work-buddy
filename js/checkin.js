// ===== 打卡日历（滚轴选小时）+ 学习时长折线图（周/月/年） =====
import { getData, save, today, fmtDate } from './store.js';

let viewYear, viewMonth;      // 当前日历显示的年月
let wheelDate = null;         // 正在打卡的日期
let trendRange = 'week';
let trendChart = null;

const HOUR_OPTIONS = [];
for (let h = 0.5; h <= 16; h += 0.5) HOUR_OPTIONS.push(h);

export function initCheckin() {
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();

  document.getElementById('calPrev').onclick = () => { shiftMonth(-1); };
  document.getElementById('calNext').onclick = () => { shiftMonth(1); };

  // 滚轴弹窗
  const wheel = document.getElementById('wheel');
  wheel.innerHTML = '<div class="w-pad"></div>' +
    HOUR_OPTIONS.map(h => `<div class="w-item">${h} 小时</div>`).join('') +
    '<div class="w-pad"></div>';

  const modal = document.getElementById('wheelModal');
  modal.querySelector('[data-close]').onclick = () => modal.classList.remove('show');
  document.getElementById('wheelOk').onclick = () => {
    const idx = Math.round(wheel.scrollTop / 40);
    const hours = HOUR_OPTIONS[Math.max(0, Math.min(idx, HOUR_OPTIONS.length - 1))];
    getData().checkins[wheelDate] = hours;
    save(); modal.classList.remove('show');
    renderCalendar(); renderSummary(); renderTrend();
  };
  document.getElementById('wheelClear').onclick = () => {
    delete getData().checkins[wheelDate];
    save(); modal.classList.remove('show');
    renderCalendar(); renderSummary(); renderTrend();
  };

  // 时长趋势 周/月/年 切换
  document.querySelectorAll('#trendSeg button').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('#trendSeg button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      trendRange = btn.dataset.range;
      renderTrend();
    };
  });

  renderCalendar(); renderSummary(); renderTrend();
}

function shiftMonth(delta) {
  viewMonth += delta;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar(); renderSummary();
}

function renderCalendar() {
  document.getElementById('calTitle').textContent = `${viewYear} 年 ${viewMonth + 1} 月`;
  const grid = document.getElementById('calGrid');
  const first = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // 周一开头
  const checkins = getData().checkins;
  const todayStr = today();

  let html = '';
  for (let i = 0; i < lead; i++) html += '<div class="cal-day blank"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hrs = checkins[key];
    const isFuture = key > todayStr;
    const cls = ['cal-day'];
    if (hrs != null) cls.push('checked');
    if (key === todayStr) cls.push('today');
    if (isFuture) cls.push('future');
    html += `<div class="${cls.join(' ')}" data-date="${key}" ${isFuture ? '' : 'data-active="1"'}>
      <span>${d}</span>${hrs != null ? `<span class="hrs">${hrs}h</span>` : ''}</div>`;
  }
  grid.innerHTML = html;
  grid.querySelectorAll('[data-active]').forEach(cell => {
    cell.onclick = () => openWheel(cell.dataset.date);
  });
}

function openWheel(date) {
  wheelDate = date;
  document.getElementById('wheelTitle').textContent = `${date} 打卡`;
  const modal = document.getElementById('wheelModal');
  modal.classList.add('show');
  const wheel = document.getElementById('wheel');
  const cur = getData().checkins[date];
  const idx = cur != null ? HOUR_OPTIONS.indexOf(cur) : HOUR_OPTIONS.indexOf(2); // 默认 2 小时
  requestAnimationFrame(() => { wheel.scrollTop = Math.max(0, idx) * 40; });
}

function renderSummary() {
  const box = document.getElementById('monthSummary');
  const checkins = getData().checkins;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  let count = 0, hours = 0, best = 0, bestDay = '';
  for (const [k, v] of Object.entries(checkins)) {
    if (k.startsWith(prefix)) {
      count++; hours += v;
      if (v > best) { best = v; bestDay = k.slice(8); }
    }
  }
  const pct = Math.round(count / daysInMonth * 100);
  box.innerHTML = `
    <div class="row">
      <div class="item"><span class="big-num">${count}</span><p>打卡天数</p></div>
      <div class="item"><span class="big-num">${hours.toFixed(1)}</span><p>累计小时</p></div>
      <div class="item"><span class="big-num">${count ? (hours / count).toFixed(1) : 0}</span><p>日均小时</p></div>
    </div>
    <div>
      <p class="hint">本月打卡率 ${pct}%（${count}/${daysInMonth} 天）</p>
      <div class="progress-bar"><i style="width:${pct}%"></i></div>
    </div>
    ${best ? `<p class="hint">💪 本月最长一天：${viewMonth + 1} 月 ${+bestDay} 日，学了 ${best} 小时</p>` : '<p class="hint">本月还没有打卡记录</p>'}`;
}

function renderTrend() {
  const el = document.getElementById('trendChart');
  if (!window.echarts) { el.innerHTML = '<p class="empty">图表库加载失败（需联网加载 ECharts）</p>'; return; }
  if (!trendChart) trendChart = echarts.init(el);
  const checkins = getData().checkins;
  const labels = [], values = [];

  if (trendRange === 'week') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = fmtDate(d);
      labels.push(key.slice(5));
      values.push(checkins[key] || 0);
    }
  } else if (trendRange === 'month') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = fmtDate(d);
      labels.push(key.slice(5));
      values.push(checkins[key] || 0);
    }
  } else {
    // 近 12 个月，按月合计
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      let sum = 0;
      for (const [k, v] of Object.entries(checkins)) if (k.startsWith(prefix)) sum += v;
      labels.push(`${d.getFullYear() % 100}/${d.getMonth() + 1}`);
      values.push(+sum.toFixed(1));
    }
  }

  trendChart.setOption({
    tooltip: { trigger: 'axis', valueFormatter: v => v + ' 小时' },
    grid: { left: 45, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: labels, axisLabel: { color: '#7b869e' } },
    yAxis: { type: 'value', name: '小时', axisLabel: { color: '#7b869e' } },
    series: [{
      type: 'line', data: values, smooth: true,
      itemStyle: { color: '#4f6ef7' }, lineStyle: { width: 3 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: 'rgba(79,110,247,.25)' }, { offset: 1, color: 'rgba(79,110,247,0)' }] } }
    }]
  });
}

export function resizeCharts() { trendChart && trendChart.resize(); }

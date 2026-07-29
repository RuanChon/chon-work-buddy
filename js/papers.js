// ===== 试卷分析模块：行测/申论/综应 成绩趋势 + 试卷录入与复盘 =====
import { getData, save, uid, today, esc, rateClass } from './store.js';

let paperType = '行测';
let paperChart = null;
let editingId = null;

const XC_DEFAULT_SECTIONS = ['言语理解', '判断推理', '数量关系', '资料分析', '常识判断'];

export function initPapers() {
  const modal = document.getElementById('paperModal');
  document.getElementById('paperAddBtn').onclick = () => openModal(null);
  modal.querySelector('[data-close]').onclick = () => modal.classList.remove('show');
  document.getElementById('ppSecAdd').onclick = () => addSectionRow();
  document.getElementById('ppType').onchange = () => fillDefaultSections();
  document.getElementById('ppSaveBtn').onclick = savePaper;

  document.querySelectorAll('#paperSeg button').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('#paperSeg button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      paperType = btn.dataset.type;
      renderChart(); renderList();
    };
  });

  renderChart(); renderList();
}

// ---------- 录入弹窗 ----------
function openModal(paper) {
  editingId = paper ? paper.id : null;
  document.getElementById('paperModalTitle').textContent = paper ? '编辑试卷' : '录入试卷';
  document.getElementById('ppType').value = paper ? paper.type : paperType;
  document.getElementById('ppName').value = paper ? paper.name : '';
  document.getElementById('ppDate').value = paper ? paper.date : today();
  document.getElementById('ppScore').value = paper ? paper.score : '';
  document.getElementById('ppFull').value = paper ? paper.full : 100;
  document.getElementById('ppDuration').value = paper ? paper.duration : '';
  document.getElementById('ppNotes').value = paper ? paper.notes : '';
  document.getElementById('ppSections').innerHTML = '';
  if (paper && paper.sections?.length) paper.sections.forEach(s => addSectionRow(s));
  else fillDefaultSections();
  updateRateHint();
  document.getElementById('paperModal').classList.add('show');
}

function fillDefaultSections() {
  const box = document.getElementById('ppSections');
  box.innerHTML = '';
  if (document.getElementById('ppType').value === '行测') {
    XC_DEFAULT_SECTIONS.forEach(name => addSectionRow({ name }));
  }
}

function addSectionRow(s = {}) {
  const box = document.getElementById('ppSections');
  const row = document.createElement('div');
  row.className = 'pp-sec-row';
  row.innerHTML = `
    <input type="text" class="sec-name" placeholder="板块名称" value="${esc(s.name || '')}">
    <input type="number" class="sec-total" placeholder="题数" min="0" value="${s.total ?? ''}" style="max-width:80px">
    <input type="number" class="sec-correct" placeholder="对题" min="0" value="${s.correct ?? ''}" style="max-width:80px">
    <input type="number" class="sec-score" placeholder="得分" step="0.5" min="0" value="${s.score ?? ''}" style="max-width:80px">
    <button class="btn danger sm">✕</button>`;
  row.querySelector('button').onclick = () => { row.remove(); updateRateHint(); };
  row.querySelectorAll('input').forEach(i => i.oninput = updateRateHint);
  box.appendChild(row);
}

function collectSections() {
  return [...document.querySelectorAll('#ppSections .pp-sec-row')].map(row => ({
    name: row.querySelector('.sec-name').value.trim(),
    total: parseInt(row.querySelector('.sec-total').value, 10) || 0,
    correct: parseInt(row.querySelector('.sec-correct').value, 10) || 0,
    score: parseFloat(row.querySelector('.sec-score').value) || 0,
  })).filter(s => s.name);
}

function updateRateHint() {
  const secs = collectSections();
  const total = secs.reduce((s, x) => s + x.total, 0);
  const correct = secs.reduce((s, x) => s + x.correct, 0);
  document.getElementById('ppRateHint').textContent = total
    ? `整卷正确率：${correct}/${total} = ${(correct / total * 100).toFixed(1)}%`
    : '填写各板块题数与对题数后自动计算正确率';
}

function savePaper() {
  const name = document.getElementById('ppName').value.trim();
  const date = document.getElementById('ppDate').value;
  const score = parseFloat(document.getElementById('ppScore').value);
  if (!name || !date || isNaN(score)) { alert('请填写试卷名称、日期和得分'); return; }
  const paper = {
    id: editingId || uid(),
    type: document.getElementById('ppType').value,
    name, date, score,
    full: parseFloat(document.getElementById('ppFull').value) || 100,
    duration: parseInt(document.getElementById('ppDuration').value, 10) || null,
    sections: collectSections(),
    notes: document.getElementById('ppNotes').value.trim(),
  };
  const d = getData();
  if (editingId) {
    const i = d.papers.findIndex(p => p.id === editingId);
    if (i > -1) d.papers[i] = paper;
  } else {
    d.papers.push(paper);
  }
  save();
  document.getElementById('paperModal').classList.remove('show');
  paperType = paper.type;
  document.querySelectorAll('#paperSeg button').forEach(b => b.classList.toggle('active', b.dataset.type === paperType));
  renderChart(); renderList();
}

// ---------- 成绩趋势折线图 ----------
function renderChart() {
  const el = document.getElementById('paperChart');
  if (!window.echarts) { el.innerHTML = '<p class="empty">图表库加载失败（需联网加载 ECharts）</p>'; return; }
  if (!paperChart) paperChart = echarts.init(el);
  const papers = getData().papers
    .filter(p => p.type === paperType)
    .sort((a, b) => a.date.localeCompare(b.date));

  paperChart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (ps) => {
        const p = papers[ps[0].dataIndex];
        return `<b>${esc(p.name)}</b><br>日期：${p.date}<br>得分：${p.score}/${p.full}` +
          (p.duration ? `<br>用时：${p.duration} 分钟` : '');
      }
    },
    grid: { left: 45, right: 20, top: 30, bottom: 55 },
    xAxis: {
      type: 'category',
      data: papers.map(p => p.date.slice(2)),
      axisLabel: { color: '#7b869e', rotate: 30 }
    },
    yAxis: { type: 'value', name: '分数', axisLabel: { color: '#7b869e' } },
    series: [{
      type: 'line', data: papers.map(p => p.score), smooth: true,
      symbolSize: 9, itemStyle: { color: '#e8554d' }, lineStyle: { width: 3 },
      label: { show: true, color: '#26324b', fontSize: 11 },
      markLine: papers.length > 1 ? { data: [{ type: 'average', name: '平均分' }], lineStyle: { color: '#f59e0b' } } : undefined
    }]
  }, true);
}

// ---------- 试卷列表 ----------
function renderList() {
  const box = document.getElementById('paperList');
  const papers = getData().papers
    .filter(p => p.type === paperType)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!papers.length) { box.innerHTML = `<p class="empty">还没有「${paperType}」试卷记录，点击右上角录入吧</p>`; return; }

  box.innerHTML = papers.map(p => {
    const total = (p.sections || []).reduce((s, x) => s + x.total, 0);
    const correct = (p.sections || []).reduce((s, x) => s + x.correct, 0);
    const rate = total ? (correct / total * 100).toFixed(1) : null;
    const secRows = (p.sections || []).map(s => {
      const r = s.total ? (s.correct / s.total * 100).toFixed(1) : null;
      return `<tr><td>${esc(s.name)}</td><td>${s.total || '—'}</td><td>${s.correct || '—'}</td>
        <td>${r != null ? `<span class="${rateClass(+r)}">${r}%</span>` : '—'}</td><td>${s.score || '—'}</td></tr>`;
    }).join('');
    return `<div class="paper-item" data-id="${p.id}">
      <div class="head">
        <div>
          <div class="title">${esc(p.name)}</div>
          <div class="sub">📅 ${p.date} ${p.duration ? `｜⏱ ${p.duration} 分钟` : ''} ${rate != null ? `｜正确率 ${rate}%` : ''}</div>
        </div>
        <div class="score">${p.score}<small style="font-size:12px;color:#7b869e">/${p.full}</small></div>
      </div>
      <div class="paper-detail">
        ${secRows ? `<table class="stat-table"><tr><th>板块</th><th>题数</th><th>对题</th><th>正确率</th><th>得分</th></tr>${secRows}</table>` : ''}
        ${p.notes ? `<div class="notes-box">📌 <b>错题 & 遗忘知识点</b><br>${esc(p.notes)}</div>` : ''}
        <div class="form-row" style="margin-top:12px">
          <button class="btn ghost sm" data-edit="${p.id}">编辑</button>
          <button class="btn danger sm" data-del="${p.id}">删除</button>
        </div>
      </div>
    </div>`;
  }).join('');

  box.querySelectorAll('.paper-item .head').forEach(head => {
    head.onclick = () => head.parentElement.classList.toggle('open');
  });
  box.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openModal(getData().papers.find(p => p.id === btn.dataset.edit));
    };
  });
  box.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (!confirm('删除这份试卷记录？')) return;
      const d = getData();
      d.papers = d.papers.filter(p => p.id !== btn.dataset.del);
      save(); renderChart(); renderList();
    };
  });
}

export function resizeCharts() { paperChart && paperChart.resize(); }

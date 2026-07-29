// ===== 应用入口：导航 + 各模块初始化 =====
import { getData, today } from './store.js';
import { initCountdown } from './countdown.js';
import { initPractice, resizeCharts as rzPractice } from './practice.js';
import { initPlan } from './plan.js';
import { initMistakes } from './mistakes.js';
import { initCheckin, resizeCharts as rzCheckin } from './checkin.js';
import { initPapers, resizeCharts as rzPapers } from './papers.js';

// 导航切换
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('page-' + btn.dataset.page).classList.add('active');
    // 图表在隐藏容器中初始化会尺寸异常，切换后 resize
    requestAnimationFrame(() => { rzPractice(); rzCheckin(); rzPapers(); });
  });
});

// 侧边栏今日信息
function renderTodayInfo() {
  const d = getData();
  const t = today();
  const rows = d.practice.filter(p => p.date === t);
  const total = rows.reduce((s, p) => s + p.total, 0);
  const hours = d.checkins[t];
  document.getElementById('todayInfo').innerHTML =
    `📆 ${t}<br>今日做题：${total} 题<br>今日打卡：${hours != null ? hours + ' 小时' : '未打卡'}`;
}

// 初始化各模块
initCountdown();
initPractice();
initPlan();
initMistakes();
initCheckin();
initPapers();
renderTodayInfo();

// 数据变化后侧边栏信息保持更新（简单轮询即可）
setInterval(renderTodayInfo, 3000);

window.addEventListener('resize', () => { rzPractice(); rzCheckin(); rzPapers(); });

// 点击弹窗遮罩关闭
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show'); });
});

import { useState } from 'react';
import { useStore } from '../useStore.jsx';
import Chart from './Chart.jsx';

const ym = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const ymd = (d) =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

export default function Checkin() {
  const { data, apply } = useStore();
  const now = new Date();
  const [cur, setCur] = useState(ym(now));
  const [sel, setSel] = useState(ymd(now));
  const [hours, setHours] = useState(1);
  const [range, setRange] = useState('month');

  const [cy, cm] = cur.split('-').map(Number);
  const first = new Date(cy, cm - 1, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(cy, cm, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(ymd(new Date(cy, cm - 1, d)));

  function save() {
    apply((d) => { d.checkins[sel] = hours; });
  }
  function prev() {
    let m = cm - 2, y = cy;
    if (m < 0) { m = 11; y--; }
    setCur(y + '-' + String(m + 1).padStart(2, '0'));
  }
  function next() {
    let m = cm, y = cy;
    if (m > 11) { m = 0; y++; }
    setCur(y + '-' + String(m + 1).padStart(2, '0'));
  }

  const curHours = data.checkins[sel] ?? 0;
  const monthKeys = Object.keys(data.checkins).filter((k) => k.startsWith(cur));
  const monthTotal = monthKeys.reduce((s, k) => s + (data.checkins[k] || 0), 0);
  const monthDays = monthKeys.length;

  let labels = [], vals = [];
  if (range === 'week') {
    for (let i = 6; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const k = ymd(dt);
      labels.push(k.slice(5));
      vals.push(data.checkins[k] || 0);
    }
  } else if (range === 'month') {
    for (let i = 29; i >= 0; i--) {
      const d2 = new Date();
      d2.setDate(d2.getDate() - i);
      const k = ymd(d2);
      labels.push(k.slice(5));
      vals.push(data.checkins[k] || 0);
    }
  } else {
    const dt = new Date();
    for (let i = 11; i >= 0; i--) {
      const d2 = new Date(dt.getFullYear(), dt.getMonth() - i, 1);
      const kk = ym(d2);
      labels.push(kk.slice(2));
      const tot = Object.keys(data.checkins)
        .filter((k) => k.startsWith(kk))
        .reduce((s, k) => s + data.checkins[k], 0);
      vals.push(tot);
    }
  }

  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: labels },
    yAxis: { type: 'value', name: '小时' },
    series: [{ type: 'line', smooth: true, areaStyle: {}, data: vals }]
  };

  return (
    <div>
      <div className="two-col">
        <section>
          <div className="cal-head">
            <button className="btn sm" onClick={prev}>‹</button>
            <b>{cur}</b>
            <button className="btn sm" onClick={next}>›</button>
          </div>
          <div className="calendar">
            {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
              <div key={d} className="cal-dow">{d}</div>
            ))}
            {cells.map((c, i) =>
              c ? (
                <button
                  key={i}
                  className={'cal-cell' + (data.checkins[c] ? ' filled' : '') + (c === sel ? ' sel' : '')}
                  onClick={() => { setSel(c); setHours(data.checkins[c] || 1); }}
                >
                  <span>{+c.slice(8)}</span>
                  {data.checkins[c] ? <em>{data.checkins[c]}h</em> : null}
                </button>
              ) : (
                <div key={i} className="cal-cell empty" />
              )
            )}
          </div>
          <div className="cal-detail">
            <div>日期：<b>{sel}</b> {curHours ? `已打卡 ${curHours}h` : '未打卡'}</div>
            <div className="scroll-hours">
              <input
                type="range"
                min="0.5"
                max="16"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(+e.target.value)}
              />
              <span className="hours-val">{hours} 小时</span>
            </div>
            <button className="btn primary" onClick={save}>保存打卡</button>
          </div>
        </section>

        <section>
          <h3>本月概览</h3>
          <div className="mini-stats">
            <div className="chip">累计 {monthTotal}h</div>
            <div className="chip">打卡 {monthDays} 天</div>
            <div className="chip">日均 {monthDays ? (monthTotal / monthDays).toFixed(1) : 0}h</div>
          </div>
          <h3>学习时长</h3>
          <div className="row filter">
            <button className={range === 'week' ? 'btn sm active' : 'btn sm'} onClick={() => setRange('week')}>周</button>
            <button className={range === 'month' ? 'btn sm active' : 'btn sm'} onClick={() => setRange('month')}>月</button>
            <button className={range === 'year' ? 'btn sm active' : 'btn sm'} onClick={() => setRange('year')}>年</button>
          </div>
          <Chart option={option} height={260} />
        </section>
      </div>
    </div>
  );
}

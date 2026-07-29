import { useState } from 'react';
import { useStore } from '../useStore.jsx';
import { BOARDS, uid, todayStr } from '../constants.js';
import Chart from './Chart.jsx';

export default function Practice() {
  const { data, apply } = useStore();
  const [date, setDate] = useState(todayStr());
  const [board, setBoard] = useState('verbal');
  const [done, setDone] = useState('');
  const [correct, setCorrect] = useState('');

  function add(e) {
    e.preventDefault();
    const dN = +done, cN = +correct;
    if (!dN || cN > dN) return;
    apply((d) => { d.practice.push({ id: uid(), date, board, done: dN, correct: cN }); });
    setDone('');
    setCorrect('');
  }
  function del(id) {
    apply((d) => { d.practice = d.practice.filter((x) => x.id !== id); });
  }

  const today = data.practice.filter((p) => p.date === todayStr());

  const days = [];
  for (let i = 13; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    days.push(dt.toISOString().slice(0, 10));
  }
  const byDay = days.map((d) => {
    const items = data.practice.filter((p) => p.date === d);
    const tot = items.reduce((s, p) => s + p.done, 0);
    const cor = items.reduce((s, p) => s + p.correct, 0);
    return { d, tot, rate: tot ? Math.round((cor / tot) * 100) : 0 };
  });

  const option = {
    color: ['#3b6cff', '#72b84a'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      data: ['做题数', '正确率%'],
      top: 6,
      left: 'center',
      itemGap: 24
    },
    grid: {
      left: 18,
      right: 18,
      top: 68,
      bottom: 18,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: byDay.map((x) => x.d.slice(5)),
      axisTick: { alignWithLabel: true },
      axisLabel: {
        margin: 12,
        interval: (index) => (typeof window !== 'undefined' && window.innerWidth <= 520 ? index % 2 === 0 : true)
      }
    },
    yAxis: [
      { type: 'value', name: '题数', nameGap: 14, minInterval: 1 },
      { type: 'value', name: '正确率', nameGap: 14, min: 0, max: 100, axisLabel: { formatter: '{value}%' } }
    ],
    series: [
      {
        name: '做题数',
        type: 'bar',
        barMaxWidth: 24,
        data: byDay.map((x) => x.tot),
        itemStyle: { borderRadius: [5, 5, 0, 0] }
      },
      {
        name: '正确率%',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbolSize: 7,
        data: byDay.map((x) => x.rate)
      }
    ]
  };

  const recent = [...data.practice].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);

  return (
    <div>
      <form className="row" onSubmit={add}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select value={board} onChange={(e) => setBoard(e.target.value)}>
          {BOARDS.map((b) => <option key={b.key} value={b.key}>{b.name}</option>)}
        </select>
        <input type="number" min="1" placeholder="做题数" value={done} onChange={(e) => setDone(e.target.value)} />
        <input type="number" min="0" placeholder="正确数" value={correct} onChange={(e) => setCorrect(e.target.value)} />
        <button className="btn primary" type="submit">记录</button>
      </form>

      <h3>今日各板块</h3>
      <div className="mini-stats">
        {BOARDS.map((b) => {
          const t = today.filter((p) => p.board === b.key);
          const tot = t.reduce((s, p) => s + p.done, 0);
          const cor = t.reduce((s, p) => s + p.correct, 0);
          return (
            <div key={b.key} className="chip">
              {b.name}：{tot}题 {tot ? Math.round((cor / tot) * 100) : 0}%
            </div>
          );
        })}
      </div>

      <section className="practice-chart-card">
        <div className="practice-section-head">
          <div>
            <h3>近 14 天趋势</h3>
            <p>做题数量与正确率变化</p>
          </div>
        </div>
        <Chart option={option} height="clamp(320px, 34vw, 390px)" className="practice-chart" />
      </section>

      <section className="practice-records">
        <h3>最近记录</h3>
        <div className="table-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>日期</th><th>板块</th><th>做题</th><th>正确</th><th>正确率</th><th></th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => {
                const b = BOARDS.find((x) => x.key === p.board);
                return (
                  <tr key={p.id}>
                    <td>{p.date}</td>
                    <td>{b ? b.name : p.board}</td>
                    <td>{p.done}</td>
                    <td>{p.correct}</td>
                    <td>{Math.round((p.correct / p.done) * 100)}%</td>
                    <td><button className="btn ghost sm" onClick={() => del(p.id)}>删</button></td>
                  </tr>
                );
              })}
              {recent.length === 0 && (
                <tr><td colSpan="6" className="muted">暂无记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

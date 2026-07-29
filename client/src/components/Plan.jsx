import { useState } from 'react';
import { useStore } from '../useStore.jsx';
import { uid, todayStr } from '../constants.js';

export default function Plan() {
  const { data, apply } = useStore();
  const [longText, setLongText] = useState('');
  const [dailyDate, setDailyDate] = useState(todayStr());
  const [dailyText, setDailyText] = useState('');

  const long = data.plans.filter((p) => p.kind === 'long');
  const daily = data.plans.filter((p) => p.kind === 'daily' && p.date === dailyDate);

  function addLong(e) {
    e.preventDefault();
    if (!longText) return;
    apply((d) => { d.plans.push({ id: uid(), kind: 'long', text: longText, done: false }); });
    setLongText('');
  }
  function addDaily(e) {
    e.preventDefault();
    if (!dailyText) return;
    apply((d) => { d.plans.push({ id: uid(), kind: 'daily', date: dailyDate, text: dailyText, done: false }); });
    setDailyText('');
  }
  function toggle(id) {
    apply((d) => { const it = d.plans.find((x) => x.id === id); if (it) it.done = !it.done; });
  }
  function del(id) {
    apply((d) => { d.plans = d.plans.filter((x) => x.id !== id); });
  }

  return (
    <div className="two-col">
      <section>
        <h3>长期学习计划</h3>
        <form className="row" onSubmit={addLong}>
          <input placeholder="例如：刷完言语理解 1000 题" value={longText} onChange={(e) => setLongText(e.target.value)} />
          <button className="btn primary" type="submit">添加</button>
        </form>
        <ul className="list">
          {long.map((p) => (
            <li key={p.id} className={p.done ? 'done' : ''}>
              <label>
                <input type="checkbox" checked={p.done} onChange={() => toggle(p.id)} />
                <span>{p.text}</span>
              </label>
              <button className="btn ghost sm" onClick={() => del(p.id)}>删</button>
            </li>
          ))}
          {long.length === 0 && <li className="muted">暂无</li>}
        </ul>
      </section>

      <section>
        <h3>每日计划表</h3>
        <div className="row">
          <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
        </div>
        <form className="row" onSubmit={addDaily}>
          <input placeholder="今日计划项（做完可勾选划线）" value={dailyText} onChange={(e) => setDailyText(e.target.value)} />
          <button className="btn primary" type="submit">添加</button>
        </form>
        <ul className="list">
          {daily.map((p) => (
            <li key={p.id} className={p.done ? 'done' : ''}>
              <label>
                <input type="checkbox" checked={p.done} onChange={() => toggle(p.id)} />
                <span>{p.text}</span>
              </label>
              <button className="btn ghost sm" onClick={() => del(p.id)}>删</button>
            </li>
          ))}
          {daily.length === 0 && <li className="muted">这一天还没有计划</li>}
        </ul>
      </section>
    </div>
  );
}

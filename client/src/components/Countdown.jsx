import { useState } from 'react';
import { useStore } from '../useStore.jsx';
import { uid } from '../constants.js';

function daysLeft(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}

export default function Countdown() {
  const { data, apply } = useStore();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('国考');

  const exams = [...data.exams].sort((a, b) => a.date.localeCompare(b.date));

  function add(e) {
    e.preventDefault();
    if (!name || !date) return;
    apply((d) => { d.exams.push({ id: uid(), name, date, type }); });
    setName('');
    setDate('');
  }
  function del(id) {
    apply((d) => { d.exams = d.exams.filter((x) => x.id !== id); });
  }

  return (
    <div>
      <form className="row" onSubmit={add}>
        <input placeholder="考试名称" value={name} onChange={(e) => setName(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option>国考</option>
          <option>省考</option>
          <option>事业单位</option>
          <option>其它</option>
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="btn primary" type="submit">添加</button>
      </form>

      <div className="cards">
        {exams.length === 0 && <p className="muted">还没有添加考试，先在上方添加吧</p>}
        {exams.map((x) => {
          const dl = daysLeft(x.date);
          return (
            <div key={x.id} className={'exam-card' + (dl <= 30 ? ' warn' : '')}>
              <div className="exam-top">
                <b>{x.name}</b>
                <span className="tag">{x.type}</span>
              </div>
              <div className="exam-date">{x.date}</div>
              <div className="exam-days">
                {dl > 0 ? `还有 ${dl} 天` : dl === 0 ? '就是今天！' : '已过期'}
              </div>
              <button className="btn ghost sm" onClick={() => del(x.id)}>删除</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

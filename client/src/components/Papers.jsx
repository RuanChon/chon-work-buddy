import { useState } from 'react'
import { useStore } from '../useStore.jsx'
import { PAPER_TYPES, uid } from '../constants.js'
import Chart from './Chart.jsx'

export default function Papers() {
  const { data, apply } = useStore()
  const [type, setType] = useState('行测')
  const [name, setName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('')
  const [score, setScore] = useState('')
  const [sections, setSections] = useState([{ name: '', score: '', total: '' }])
  const [note, setNote] = useState('')
  const [mistakes, setMistakes] = useState('')

  function addSection() {
    setSections(a => [...a, { name: '', score: '', total: '' }])
  }
  function upSection(i, key, val) {
    setSections(a => a.map((s, j) => (j === i ? { ...s, [key]: val } : s)))
  }
  function submit(e) {
    e.preventDefault()
    const secs = sections
      .filter(s => s.name && s.total)
      .map(s => ({ name: s.name, score: +s.score || 0, total: +s.total }))
    const sumScore = secs.reduce((s, x) => s + x.score, 0)
    const sumTotal = secs.reduce((s, x) => s + x.total, 0)
    apply(d => {
      d.papers.push({
        id: uid(),
        type,
        name,
        date,
        time: +time || 0,
        score: +score || 0,
        sections: secs,
        note,
        mistakes,
        createdAt: Date.now(),
        rate: sumTotal ? Math.round((sumScore / sumTotal) * 100) : 0,
      })
    })
    setName('')
    setScore('')
    setTime('')
    setSections([{ name: '', score: '', total: '' }])
    setNote('')
    setMistakes('')
  }
  function del(id) {
    apply(d => {
      d.papers = d.papers.filter(x => x.id !== id)
    })
  }

  // “综应”已更名为“公专”；兼容历史记录，避免旧数据在切换分类后不可见。
  const list = data.papers
    .filter(p => p.type === type || (type === '公专' && p.type === '综应'))
    .sort((a, b) => a.date.localeCompare(b.date))
  const avg = list.length ? Math.round(list.reduce((s, p) => s + p.score, 0) / list.length) : 0
  const option = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: list.map(p => p.date) },
    yAxis: { type: 'value', name: '分数' },
    series: [
      { type: 'line', smooth: true, name: '分数', data: list.map(p => p.score) },
      { type: 'line', name: '平均分', data: list.map(() => avg), lineStyle: { type: 'dashed' } },
    ],
  }

  return (
    <div>
      <div className="row filter pd-10">
        {PAPER_TYPES.map(t => (
          <button key={t} className={type === t ? 'btn sm active' : 'btn sm'} onClick={() => setType(t)}>
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="paper-form">
        <div className="row">
          <input placeholder="试卷名称" value={name} onChange={e => setName(e.target.value)} />
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          <input type="number" placeholder="用时(分钟)" value={time} onChange={e => setTime(e.target.value)} />
          <input type="number" placeholder="总分" value={score} onChange={e => setScore(e.target.value)} />
        </div>
        <h4>板块得分</h4>
        {sections.map((s, i) => (
          <div key={i} className="row sec-row">
            <input placeholder="板块名" value={s.name} onChange={e => upSection(i, 'name', e.target.value)} />
            <input
              type="number"
              placeholder="得分"
              value={s.score}
              onChange={e => upSection(i, 'score', e.target.value)}
            />
            <input
              type="number"
              placeholder="满分"
              value={s.total}
              onChange={e => upSection(i, 'total', e.target.value)}
            />
            {sections.length > 1 && (
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setSections(a => a.filter((_, j) => j !== i))}
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button type="button" className="btn sm" onClick={addSection}>
          ＋ 增加板块
        </button>
        <textarea placeholder="错题与遗忘知识点备注" value={note} onChange={e => setNote(e.target.value)} />
        <textarea placeholder="易错点总结" value={mistakes} onChange={e => setMistakes(e.target.value)} />
        <button className="btn primary" type="submit">
          保存试卷
        </button>
      </form>

      <h3 className="pd-10">
        {type}成绩趋势（平均 {avg}）
      </h3>
      <Chart option={option} height={260} />

      <div className="paper-list">
        {list.length === 0 && <p className="muted pd-10">还没有{type}试卷</p>}
        {list.map(p => (
          <div key={p.id} className="paper-item">
            <div className="pi-head">
              <b>{p.name}</b>
              <span className="muted pd-10">{p.date}</span>
              <span className="tag">
                {p.score}分 / 正确率{p.rate}%
              </span>
            </div>
            <div className="pi-secs">
              {p.sections.map(s => (
                <span key={s.name} className="chip">
                  {s.name}:{s.score}/{s.total}
                </span>
              ))}
            </div>
            {p.note && <p className="note">备注：{p.note}</p>}
            {p.mistakes && <p className="note">易错：{p.mistakes}</p>}
            <button className="btn ghost sm" onClick={() => del(p.id)}>
              删除
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

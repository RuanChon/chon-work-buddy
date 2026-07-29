export default function Sidebar({ sections, active, onSelect, onSettings, syncStatus }) {
  const syncLabel = syncStatus === 'saving' ? '正在同步…' : '同步与设置'

  return (
    <aside className="sidebar">
      <div className="logo">
        <span className="logo-copy">
          <strong>上岸</strong>
          <small>备考工作台</small>
        </span>
      </div>
      <nav>
        {sections.map(s => (
          <button
            key={s.key}
            className={'nav-item' + (active === s.key ? ' active' : '')}
            onClick={() => onSelect(s.key)}
          >
            <span className="nav-label">{s.name}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-actions">
        <button className="nav-item nav-sync" type="button" onClick={onSettings} disabled={syncStatus === 'saving'}>
          <span className="nav-label">{syncLabel}</span>
        </button>
      </div>
      <div className="sidebar-foot">数据云端同步 · 多端共享</div>
    </aside>
  )
}

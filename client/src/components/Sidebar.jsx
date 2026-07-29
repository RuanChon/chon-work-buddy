export default function Sidebar({ sections, active, onSelect, onSync, syncStatus }) {
  const syncLabel = syncStatus === 'saving' ? '正在同步…' : '同步到云端';

  return (
    <aside className="sidebar">
      <div className="logo">🎯 公考工作台</div>
      <nav>
        {sections.map((s) => (
          <button
            key={s.key}
            className={'nav-item' + (active === s.key ? ' active' : '')}
            onClick={() => onSelect(s.key)}
          >
            <span className="ico">{s.icon}</span>
            <span className="nav-label">{s.name}</span>
          </button>
        ))}
      </nav>
      <button className="nav-item nav-sync" type="button" onClick={onSync} disabled={syncStatus === 'saving'}>
        <span className="ico">☁</span>
        <span className="nav-label">{syncLabel}</span>
      </button>
      <div className="sidebar-foot">数据云端同步 · 多端共享</div>
    </aside>
  );
}

export default function Sidebar({ sections, active, onSelect }) {
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
            {s.name}
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">数据云端同步 · 多端共享</div>
    </aside>
  );
}

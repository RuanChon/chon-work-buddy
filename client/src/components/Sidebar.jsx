export default function Sidebar({
  sections,
  active,
  onSelect,
  onSettings,
  onPull,
  onUpload,
  syncStatus,
  syncAction,
}) {
  const syncLabel = syncStatus === 'saving' ? '正在同步…' : '同步与设置'
  const syncing = syncStatus === 'saving' || !!syncAction

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
        <div className="sync-shortcuts" aria-label="云端数据操作">
          <button
            className="sync-mini sync-pull"
            type="button"
            onClick={onPull}
            disabled={syncing}
            title="把云端数据拉取并合并到当前浏览器"
          >
            {syncAction === 'pull' ? '拉取中…' : '拉取'}
          </button>
          <button
            className="sync-mini sync-upload"
            type="button"
            onClick={onUpload}
            disabled={syncing}
            title="把当前浏览器的本地数据合并上传到云端"
          >
            {syncAction === 'upload' ? '上传中…' : '上传'}
          </button>
        </div>
        <button className="nav-item nav-sync" type="button" onClick={onSettings} disabled={syncing}>
          <span className="nav-label">{syncLabel}</span>
        </button>
      </div>
      <div className="sidebar-foot">数据云端同步 · 多端共享</div>
    </aside>
  )
}

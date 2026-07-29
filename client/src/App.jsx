import { useState, useRef } from 'react'
import { StoreProvider, useStore } from './useStore.jsx'
import Sidebar from './components/Sidebar.jsx'
import Countdown from './components/Countdown.jsx'
import Practice from './components/Practice.jsx'
import Plan from './components/Plan.jsx'
import Mistakes from './components/Mistakes.jsx'
import Checkin from './components/Checkin.jsx'
import Papers from './components/Papers.jsx'
import Settings from './components/Settings.jsx'
import Home from './components/Home.jsx'
import { loadSettings } from './sync.js'

const SECTIONS = [
  { key: 'home', name: '首页', icon: '🏠' },
  { key: 'countdown', name: '考试倒计时', icon: '⏳' },
  { key: 'practice', name: '每日刷题', icon: '📝' },
  { key: 'plan', name: '学习计划', icon: '🗓️' },
  { key: 'mistakes', name: '错题记录', icon: '❌' },
  { key: 'papers', name: '试卷分析', icon: '📊' },
  { key: 'checkin', name: '打卡日历', icon: '✅' },
]

function StatusBadge() {
  const { status } = useStore()
  const map = {
    init: ['同步中…', 'gray'],
    synced: ['已同步', 'green'],
    offline: ['离线(本地)', 'orange'],
    saving: ['保存中…', 'blue'],
  }
  const [t, c] = map[status] || map.init
  return <span className={'badge ' + c}>{t}</span>
}

function Main() {
  const { syncNow, status } = useStore()
  const [sec, setSec] = useState('home')
  const [showSettings, setShowSettings] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const isPublic = typeof location !== 'undefined' && location.hostname.endsWith('github.io')
  const settings = loadSettings()
  const githubConfigured = settings.mode === 'github' && !!settings.github?.token
  const needToken = isPublic && !githubConfigured

  const flash = (msg, ms = 2600) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), ms)
  }

  // 点击「同步到云端」：已配置则立即推送；未配置则打开设置引导填 Token
  const handleSyncToCloud = async () => {
    if (!githubConfigured) {
      setShowSettings(true)
      return
    }
    flash('同步中…')
    const ok = await syncNow()
    flash(ok ? '已同步到公网 ☁' : '同步失败，请检查 Token')
  }

  // 切换导航时把尚未完成的页面改动立即刷到云端，不必等待防抖计时器。
  const handleSectionSelect = key => {
    setSec(key)
    if (githubConfigured && (status === 'saving' || status === 'offline')) {
      void syncNow()
    }
  }

  // 设置保存后：若已开启 GitHub 同步，立即把当前本地数据上传到公网
  const handleSettingsSaved = async () => {
    setShowSettings(false)
    const st = loadSettings()
    const okGithub = st.mode === 'github' && !!st.github?.token
    if (!okGithub) {
      flash('已保存（本地模式，数据仅存当前浏览器）', 3000)
      return
    }
    const ok = await syncNow()
    flash(
      ok
        ? '已开启公网同步，当前数据已上传到公网 ☁'
        : '已保存设置，但同步失败：请检查 Token 权限（Contents: R/W 且仅限本仓库）',
      4200,
    )
  }

  return (
    <div className="app">
      <Sidebar
        sections={SECTIONS}
        active={sec}
        onSelect={handleSectionSelect}
        onSync={handleSyncToCloud}
        syncStatus={status}
      />
      <div className="content">
        <header className="topbar">
          <h1>永远相信美好的事情即将发生～</h1>
          <div className="top-actions">
            <StatusBadge />
            <button className="btn sm" onClick={() => setShowSettings(v => !v)}>
              ⚙ 同步
            </button>
          </div>
        </header>

        {needToken && (
          <div className="notice">
            当前为<strong>公网部署</strong>。点击左侧导航「☁ 同步到云端」或右上角「⚙ 同步」，选择 GitHub
            方式并填入仅限本仓库的 Token，数据即可实时同步到公网、在任意浏览器/设备间共享。
          </div>
        )}

        {showSettings && <Settings onClose={() => setShowSettings(false)} onSaved={handleSettingsSaved} />}

        <div className="panel">
          {sec === 'home' && <Home onNavigate={handleSectionSelect} />}
          {sec === 'countdown' && <Countdown />}
          {sec === 'practice' && <Practice />}
          {sec === 'plan' && <Plan />}
          {sec === 'mistakes' && <Mistakes />}
          {sec === 'checkin' && <Checkin />}
          {sec === 'papers' && <Papers />}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Main />
    </StoreProvider>
  )
}

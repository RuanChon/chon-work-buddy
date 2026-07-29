import { useState } from 'react';
import { StoreProvider, useStore } from './useStore.jsx';
import Sidebar from './components/Sidebar.jsx';
import Countdown from './components/Countdown.jsx';
import Practice from './components/Practice.jsx';
import Plan from './components/Plan.jsx';
import Mistakes from './components/Mistakes.jsx';
import Checkin from './components/Checkin.jsx';
import Papers from './components/Papers.jsx';

const SECTIONS = [
  { key: 'countdown', name: '考试倒计时', icon: '⏳' },
  { key: 'practice', name: '每日刷题', icon: '📝' },
  { key: 'plan', name: '学习计划', icon: '🗓️' },
  { key: 'mistakes', name: '错题记录', icon: '❌' },
  { key: 'checkin', name: '打卡日历', icon: '✅' },
  { key: 'papers', name: '试卷分析', icon: '📊' }
];

function StatusBadge() {
  const { status } = useStore();
  const map = {
    init: ['同步中…', 'gray'],
    synced: ['已同步', 'green'],
    offline: ['离线(本地)', 'orange'],
    saving: ['保存中…', 'blue']
  };
  const [t, c] = map[status] || map.init;
  return <span className={'badge ' + c}>{t}</span>;
}

function Main() {
  const [sec, setSec] = useState('countdown');
  return (
    <div className="app">
      <Sidebar sections={SECTIONS} active={sec} onSelect={setSec} />
      <div className="content">
        <header className="topbar">
          <h1>公考备考工作台</h1>
          <StatusBadge />
        </header>
        <div className="panel">
          {sec === 'countdown' && <Countdown />}
          {sec === 'practice' && <Practice />}
          {sec === 'plan' && <Plan />}
          {sec === 'mistakes' && <Mistakes />}
          {sec === 'checkin' && <Checkin />}
          {sec === 'papers' && <Papers />}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Main />
    </StoreProvider>
  );
}

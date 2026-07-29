import { useEffect, useRef, useState } from 'react';
import { useStore } from '../useStore.jsx';
import { fetchHotNews, refreshHotNews } from '../api.js';
import { loadSettings } from '../sync.js';

const NEWS_BATCH_SIZE = 10;
const pad = (value) => String(value).padStart(2, '0');
const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function daysUntil(date) {
  const target = new Date(`${date}T00:00:00`);
  const today = new Date(`${localDate()}T00:00:00`);
  return Math.max(0, Math.round((target - today) / 86400000));
}

export default function Home({ onNavigate }) {
  const { data, apply } = useStore();
  const [news, setNews] = useState({ date: '', items: [] });
  const [visibleNews, setVisibleNews] = useState([]);
  const [newsState, setNewsState] = useState('loading');
  const [newsRefreshing, setNewsRefreshing] = useState(false);
  const [newsNotice, setNewsNotice] = useState('');
  const seenNewsIds = useRef(new Set());

  useEffect(() => {
    let alive = true;
    fetchHotNews()
      .then((result) => {
        if (!alive) return;
        const initialItems = (result.items || []).slice(0, NEWS_BATCH_SIZE);
        setNews(result);
        setVisibleNews(initialItems);
        seenNewsIds.current = new Set(initialItems.map((item) => item.id));
        setNewsState(result.items?.length ? 'ready' : 'empty');
      })
      .catch(() => {
        if (alive) setNewsState('error');
      });
    return () => {
      alive = false;
    };
  }, []);

  const today = localDate();
  const upcomingExams = [...(data.exams || [])]
    .filter((exam) => exam.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextExam = upcomingExams[0];
  const todayPlans = (data.plans || []).filter((item) => item.kind === 'daily' && item.date === today);
  const completedPlans = todayPlans.filter((item) => item.done).length;
  const planProgress = todayPlans.length ? Math.round((completedPlans / todayPlans.length) * 100) : 0;

  const togglePlan = (id) => {
    apply((draft) => {
      const plan = draft.plans.find((item) => item.id === id);
      if (plan) plan.done = !plan.done;
    });
  };

  const refreshNews = async () => {
    if (newsRefreshing) return;
    setNewsRefreshing(true);
    setNewsNotice('正在重新抓取最新资讯…');

    try {
      const settings = loadSettings();
      const result = await refreshHotNews({
        github: settings.mode === 'github' ? settings.github : null,
        previousGeneratedAt: news.generatedAt
      });
      const unseenItems = (result.items || []).filter((item) => !seenNewsIds.current.has(item.id));
      const nextItems = unseenItems.slice(0, NEWS_BATCH_SIZE);

      setNews(result);
      if (!nextItems.length) {
        setNewsNotice('已是最新内容，暂时没有更多不重复资讯。');
        return;
      }

      nextItems.forEach((item) => seenNewsIds.current.add(item.id));
      setVisibleNews(nextItems);
      setNewsNotice(nextItems.length < NEWS_BATCH_SIZE ? `本次发现 ${nextItems.length} 条新资讯` : '');
    } catch (error) {
      setNewsNotice(error.message || '重新抓取失败，请稍后再试。');
    } finally {
      setNewsRefreshing(false);
    }
  };

  return (
    <div className="home">
      <div className="home-head">
        <div>
          <h2>今日概览</h2>
          <p>聚焦考试目标、今日计划与时政热点。</p>
        </div>
        <span className="home-date">{today}</span>
      </div>

      <div className="home-dashboard">
        <section className="dashboard-card countdown-overview">
          <div className="dashboard-card-head">
            <div>
              <span className="dashboard-kicker">考试倒计时</span>
              <h3>{nextExam ? nextExam.name : '还没有设置考试'}</h3>
            </div>
            <button className="card-link" type="button" onClick={() => onNavigate('countdown')}>
              管理考试 →
            </button>
          </div>

          {nextExam ? (
            <>
              <div className="countdown-main">
                <strong>{daysUntil(nextExam.date)}</strong>
                <span>天</span>
              </div>
              <div className="countdown-meta">
                <span className="tag">{nextExam.type}</span>
                <span>{nextExam.date}</span>
                <span>还有 {upcomingExams.length} 个待考目标</span>
              </div>
              {upcomingExams.length > 1 && (
                <div className="exam-preview-list">
                  {upcomingExams.slice(1, 4).map((exam) => (
                    <div key={exam.id}>
                      <span>{exam.name}</span>
                      <b>{daysUntil(exam.date)} 天</b>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <button className="empty-action" type="button" onClick={() => onNavigate('countdown')}>
              添加第一个考试目标
            </button>
          )}
        </section>

        <section className="dashboard-card todo-overview">
          <div className="dashboard-card-head">
            <div>
              <span className="dashboard-kicker">每日计划 Todo</span>
              <h3>今天完成 {completedPlans} / {todayPlans.length}</h3>
            </div>
            <button className="card-link" type="button" onClick={() => onNavigate('plan')}>
              全部计划 →
            </button>
          </div>

          <div className="todo-progress" aria-label={`今日计划完成 ${planProgress}%`}>
            <span style={{ width: `${planProgress}%` }} />
          </div>

          {todayPlans.length ? (
            <ul className="home-todo-list">
              {todayPlans.slice(0, 6).map((plan) => (
                <li key={plan.id} className={plan.done ? 'done' : ''}>
                  <label>
                    <input type="checkbox" checked={plan.done} onChange={() => togglePlan(plan.id)} />
                    <span>{plan.text}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <button className="empty-action" type="button" onClick={() => onNavigate('plan')}>
              今天还没有计划，去添加一项
            </button>
          )}
        </section>

        <article className="dashboard-card news-overview">
          <div className="dashboard-card-head news-card-head">
            <div>
              <span className="dashboard-kicker">每日热点</span>
              <h3>今日热点资讯</h3>
              <small>
                {news.date ? `${news.date} · 每天 08:00 更新` : '每天 08:00 更新'} · 时政 / 科普 / 社会
              </small>
            </div>
            <div className="news-tools">
              <span className="live-dot" aria-label="自动更新" />
              <button
                className={'news-refresh' + (newsRefreshing ? ' is-refreshing' : '')}
                type="button"
                aria-label="换一批热点"
                title="换一批热点"
                onClick={refreshNews}
                disabled={newsRefreshing}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 11a8 8 0 0 0-14.8-4.2L3 9m1-5v5h5M4 13a8 8 0 0 0 14.8 4.2L21 15m-1 5v-5h-5" />
                </svg>
              </button>
            </div>
          </div>

          {newsState === 'loading' && <p className="news-empty">正在加载今日热点…</p>}
          {newsState === 'error' && <p className="news-empty">热点加载失败，请稍后刷新。</p>}
          {newsState === 'empty' && <p className="news-empty">今天暂时没有抓取到热点。</p>}
          {newsNotice && <p className="news-refresh-note" role="status">{newsNotice}</p>}
          {newsState === 'ready' && (
            <ol
              key={visibleNews.map((item) => item.id).join('-')}
              className="headline-list headline-list-enter"
              aria-live="polite"
              aria-busy={newsRefreshing}
            >
              {visibleNews.map((item) => (
                <li key={item.id}>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    <span>{item.title}</span>
                    <em>{item.sourceName}</em>
                  </a>
                </li>
              ))}
            </ol>
          )}
        </article>
      </div>
    </div>
  );
}

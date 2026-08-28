import { useEffect, useRef, useState } from 'react';
import { useStore } from '../useStore.jsx';
import { fetchHotNews, refreshHotNews } from '../api.js';
import { loadSettings } from '../sync.js';
import { todayStr } from '../constants.js';

const NEWS_BATCH_SIZE = 10;
function daysUntil(date) {
  const target = new Date(`${date}T00:00:00`);
  const today = new Date(`${todayStr()}T00:00:00`);
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
    const settings = loadSettings();
    fetchHotNews({
      github: settings.mode === 'github' ? settings.github : null
    })
      .then((result) => {
        if (!alive) return;
        const initialItems = (result.items || []).slice(0, NEWS_BATCH_SIZE);
        setNews(result);
        setVisibleNews(initialItems);
        seenNewsIds.current = new Set(initialItems.map((item) => item.id));
        setNewsState(result.items?.length ? 'ready' : 'empty');
        if (result.date && result.date !== todayStr()) {
          setNewsNotice(`当前显示 ${result.date} 缓存，今日热点正在等待云端任务更新。`);
        }
      })
      .catch(() => {
        if (alive) setNewsState('error');
      });
    return () => {
      alive = false;
    };
  }, []);

  const today = todayStr();
  const upcomingExams = [...(data.exams || [])]
    .filter((exam) => exam.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextExam = upcomingExams[0];
  // 首页固定展示所有“每日计划”，不因计划日期变化或勾选完成而移除。
  // 只有学习计划模块中的删除操作会真正从数据中删除计划。
  const dailyPlans = (data.plans || [])
    .filter((item) => item.kind === 'daily')
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const todayPlanStatus = data.dailyPlanStatus?.[today] || {};
  const isPlanDone = (plan) => !!todayPlanStatus[plan.id]?.done;
  const completedPlans = dailyPlans.filter(isPlanDone).length;
  const planProgress = dailyPlans.length ? Math.round((completedPlans / dailyPlans.length) * 100) : 0;

  const togglePlan = (id) => {
    apply((draft) => {
      const plan = draft.plans.find((item) => item.id === id);
      if (!plan) return;
      draft.dailyPlanStatus ||= {};
      draft.dailyPlanStatus[today] ||= {};
      const previous = draft.dailyPlanStatus[today][id];
      draft.dailyPlanStatus[today][id] = {
        done: !previous?.done,
        updatedAt: Date.now()
      };
      // 清除旧版永久完成标记；新版只按日期读取 dailyPlanStatus。
      plan.done = false;
    });
  };

  const refreshNews = async () => {
    if (newsRefreshing) return;
    setNewsRefreshing(true);

    const cachedItems = (news.items || [])
      .filter((item) => !seenNewsIds.current.has(item.id))
      .slice(0, NEWS_BATCH_SIZE);
    const switchedImmediately = cachedItems.length > 0;

    if (switchedImmediately) {
      cachedItems.forEach((item) => seenNewsIds.current.add(item.id));
      setVisibleNews(cachedItems);
      setNewsNotice('已换一批，正在后台抓取最新资讯…');
    } else {
      setNewsNotice('正在重新抓取最新资讯…');
    }

    try {
      const settings = loadSettings();
      const github = settings.mode === 'github' ? settings.github : null;
      const canTriggerCloudRefresh = !!github?.token;
      const result = canTriggerCloudRefresh || !location.hostname.endsWith('github.io')
        ? await refreshHotNews({ github, previousGeneratedAt: news.generatedAt })
        : await fetchHotNews({ github });

      // 新日期的数据一旦生成，必须立即替换旧批次，不能因为旧缓存还有
      // 未展示条目而继续停留在昨天。
      if (result.date && result.date !== news.date) {
        const latestItems = (result.items || []).slice(0, NEWS_BATCH_SIZE);
        setNews(result);
        setVisibleNews(latestItems);
        seenNewsIds.current = new Set(latestItems.map((item) => item.id));
        setNewsState(latestItems.length ? 'ready' : 'empty');
        setNewsNotice(`已更新为 ${result.date} 的热点资讯`);
        return;
      }

      const unseenItems = (result.items || []).filter((item) => !seenNewsIds.current.has(item.id));
      const nextItems = unseenItems.slice(0, NEWS_BATCH_SIZE);

      setNews(result);
      if (!nextItems.length) {
        setNewsNotice(
          result.date === todayStr()
            ? '已是今日最新内容，暂时没有更多不重复资讯。'
            : `云端仍是 ${result.date || '上一日'} 缓存，今日任务尚未完成。`
        );
        return;
      }

      nextItems.forEach((item) => seenNewsIds.current.add(item.id));
      setVisibleNews(nextItems);
      setNewsNotice(
        nextItems.length < NEWS_BATCH_SIZE
          ? `本次发现 ${nextItems.length} 条新资讯`
          : switchedImmediately
            ? '云端资讯已更新，已展示下一批内容。'
            : ''
      );
    } catch (error) {
      const message = error.message || '重新抓取失败，请稍后再试。';
      setNewsNotice(switchedImmediately ? `已换一批；后台更新失败：${message}` : message);
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
              <h3>已完成 {completedPlans} / {dailyPlans.length}</h3>
            </div>
            <button className="card-link" type="button" onClick={() => onNavigate('plan')}>
              全部计划 →
            </button>
          </div>

          <div className="todo-progress" aria-label={`每日计划完成 ${planProgress}%`}>
            <span style={{ width: `${planProgress}%` }} />
          </div>

          {dailyPlans.length ? (
            <ul className="home-todo-list">
              {dailyPlans.map((plan) => (
                <li key={plan.id} className={isPlanDone(plan) ? 'done' : ''}>
                  <label>
                    <input type="checkbox" checked={isPlanDone(plan)} onChange={() => togglePlan(plan.id)} />
                    <span>{plan.text}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <button className="empty-action" type="button" onClick={() => onNavigate('plan')}>
              还没有每日计划，去添加一项
            </button>
          )}
          {dailyPlans.length > 0 && (
            <p className="todo-fixed-note">计划会固定显示；如需移除，请前往“学习计划”删除。</p>
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
              {visibleNews.map((item, index) => (
                <li key={`${item.id}-${index}`}>
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

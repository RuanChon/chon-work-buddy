import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { EMPTY_DATA } from './constants.js';
import { mergeData, getSync } from './sync.js';

const LOCAL_KEY = 'cgb_data';

const loadLocal = () => {
  try {
    const l = JSON.parse(localStorage.getItem(LOCAL_KEY));
    if (l && typeof l === 'object') return l;
  } catch {}
  return null;
};

const persistLocal = (d) => {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(d)); } catch {}
};

const COLLECTIONS = ['exams', 'practice', 'plans', 'mistakes', 'papers'];

function recordDeletions(previous, next) {
  next._deleted ||= {};
  const deletedAt = Date.now();

  for (const col of COLLECTIONS) {
    next._deleted[col] ||= {};
    const nextIds = new Set((next[col] || []).map((item) => item.id));
    for (const item of previous[col] || []) {
      if (!nextIds.has(item.id)) next._deleted[col][item.id] = deletedAt;
    }
  }
}

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  // 首屏直接用 localStorage 兜底，避免后端空数据覆盖本地改动
  const [data, setData] = useState(() => loadLocal() || EMPTY_DATA);
  const [status, setStatus] = useState('init'); // init | synced | offline | saving
  const dataRef = useRef(data);
  const revRef = useRef(0);
  const pushTimer = useRef(null);
  const pushQueue = useRef(Promise.resolve());

  // GitHub Contents API 使用 SHA 做并发控制；将推送串行化可避免自动保存和手动
  // “同步到云端”同时发生时互相制造 409 冲突。
  const pushState = useCallback((snapshot) => {
    setStatus('saving');
    const run = async () => {
      const { client } = getSync();
      const res = await client.pushState(snapshot);
      revRef.current = res.rev || 0;
      if (res.data) {
        // GitHub 写入前会先与云端合并。必须把合并结果写回当前浏览器，
        // 否则新浏览器首次配置 Token 后虽然云端同步成功，页面仍保持本地空数据。
        const merged = mergeData(res.data, dataRef.current || snapshot || EMPTY_DATA);
        dataRef.current = merged;
        setData(merged);
        persistLocal(merged);
      }
      setStatus('synced');
      return res;
    };
    const queued = pushQueue.current.catch(() => {}).then(run);
    pushQueue.current = queued;
    return queued;
  }, []);

  const apply = useCallback((updater) => {
    setData((prev) => {
      // 各模块 updater 都是「原地修改并返回 undefined」风格，
      // 因此先深拷贝再交给 updater 修改，保证 next 永远是合法对象，
      // 否则 next 会是 undefined → 状态变 undefined → 渲染崩溃（整页变空白）。
      const base = prev || EMPTY_DATA;
      const next = JSON.parse(JSON.stringify(base));
      updater(next);
      recordDeletions(base, next);
      dataRef.current = next;
      persistLocal(next);
      setStatus('saving');
      clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(async () => {
        try {
          await pushState(next);
        } catch (e) {
          console.warn('sync failed', e);
          setStatus('offline');
        }
      }, 400);
      return next;
    });
  }, [pushState]);

  // 手动立即把当前数据推送到同步后端（公网即 GitHub 仓库）
  const syncNow = useCallback(async () => {
    clearTimeout(pushTimer.current);
    try {
      await pushState(dataRef.current);
      return true;
    } catch (e) {
      console.warn('sync failed', e);
      setStatus('offline');
      return false;
    }
  }, [pushState]);

  // 手动从同步后端拉取并与当前浏览器数据做安全合并。
  // 拉取不会直接覆盖本地数据，避免尚未上传的本地记录意外丢失。
  const pullNow = useCallback(async () => {
    clearTimeout(pushTimer.current);
    setStatus('saving');
    try {
      // 等待可能正在进行的上传结束，再读取最新的云端版本。
      await pushQueue.current.catch(() => {});
      const { client } = getSync();
      const remote = await client.fetchState();
      const merged = mergeData(remote.data, dataRef.current || EMPTY_DATA);
      dataRef.current = merged;
      setData(merged);
      persistLocal(merged);
      revRef.current = remote.rev || 0;
      setStatus('synced');
      return true;
    } catch (e) {
      console.warn('pull failed', e);
      setStatus('offline');
      return false;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const localData = loadLocal() || EMPTY_DATA;

    (async () => {
      try {
        const { client } = getSync();
        const s = await client.fetchState();
        if (!alive) return;
        // 后端数据可能与本地不同步，做并集合并（本地优先），绝不整体覆盖
        const merged = mergeData(s.data, localData);
        setData(merged);
        dataRef.current = merged;
        persistLocal(merged);
        revRef.current = s.rev || 0;
        setStatus('synced');
      } catch (e) {
        // 拉取失败：保留本地数据，绝不清空
        const l = loadLocal();
        if (l) { setData(l); dataRef.current = l; }
        setStatus('offline');
      }
    })();

    const t = setInterval(async () => {
      try {
        const { client } = getSync();
        if (client.pollRev) {
          const rv = await client.pollRev();
          if (rv && rv !== revRef.current) {
            const s = await client.fetchState();
            if (!alive) return;
            const merged = mergeData(s.data, dataRef.current || EMPTY_DATA);
            setData(merged);
            dataRef.current = merged;
            persistLocal(merged);
            revRef.current = s.rev || 0;
            setStatus('synced');
          }
        } else {
          const s = await client.fetchState();
          if (s.rev !== revRef.current) {
            const merged = mergeData(s.data, dataRef.current || EMPTY_DATA);
            setData(merged);
            dataRef.current = merged;
            persistLocal(merged);
            revRef.current = s.rev || 0;
            setStatus('synced');
          }
        }
      } catch {}
    }, 8000);

    return () => {
      alive = false;
      clearInterval(t);
      clearTimeout(pushTimer.current);
    };
  }, []);

  return <Ctx.Provider value={{ data, apply, pullNow, syncNow, status }}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

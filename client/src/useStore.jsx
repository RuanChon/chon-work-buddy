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

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  // 首屏直接用 localStorage 兜底，避免后端空数据覆盖本地改动
  const [data, setData] = useState(() => loadLocal() || EMPTY_DATA);
  const [status, setStatus] = useState('init'); // init | synced | offline | saving
  const dataRef = useRef(data);
  const revRef = useRef(0);
  const pushTimer = useRef(null);

  const apply = useCallback((updater) => {
    setData((prev) => {
      // 各模块 updater 都是「原地修改并返回 undefined」风格，
      // 因此先深拷贝再交给 updater 修改，保证 next 永远是合法对象，
      // 否则 next 会是 undefined → 状态变 undefined → 渲染崩溃（整页变空白）。
      const base = prev || EMPTY_DATA;
      const next = JSON.parse(JSON.stringify(base));
      updater(next);
      dataRef.current = next;
      persistLocal(next);
      setStatus('saving');
      clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(async () => {
        try {
          const { client } = getSync();
          const res = await client.pushState(next);
          revRef.current = res.rev || 0;
          setStatus('synced');
        } catch (e) {
          console.warn('sync failed', e);
          setStatus('offline');
        }
      }, 400);
      return next;
    });
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

    return () => { alive = false; clearInterval(t); };
  }, []);

  return <Ctx.Provider value={{ data, apply, status }}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

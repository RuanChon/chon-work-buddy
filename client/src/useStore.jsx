import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import * as api from './api.js';
import { EMPTY_DATA } from './constants.js';

const Ctx = createContext(null);

export function StoreProvider({ children }) {
  const [data, setData] = useState(EMPTY_DATA);
  const [status, setStatus] = useState('init'); // init | synced | offline | saving
  const dataRef = useRef(data);
  const revRef = useRef(0);
  const pushTimer = useRef(null);

  const persistLocal = (d) => {
    try { localStorage.setItem('cgb_data', JSON.stringify(d)); } catch {}
  };

  // 本地更新并（防抖）推送到服务端
  const apply = useCallback((updater) => {
    setData((prev) => {
      const next = updater(prev);
      dataRef.current = next;
      persistLocal(next);
      setStatus('saving');
      clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(async () => {
        try {
          const res = await api.pushState(next);
          revRef.current = res.rev;
          setStatus('synced');
        } catch (e) {
          console.warn('sync failed', e);
          setStatus('offline');
        }
      }, 400);
      return next;
    });
  }, []);

  // 首次加载 + 轮询（多浏览器同步）
  useEffect(() => {
    let alive = true;
    api.fetchState()
      .then((s) => {
        if (!alive) return;
        setData(s.data);
        dataRef.current = s.data;
        revRef.current = s.rev;
        setStatus('synced');
      })
      .catch(() => {
        try {
          const l = JSON.parse(localStorage.getItem('cgb_data'));
          if (l) { setData(l); dataRef.current = l; }
        } catch {}
        setStatus('offline');
      });

    const t = setInterval(async () => {
      try {
        const s = await api.fetchState();
        if (s.rev !== revRef.current) {
          setData(s.data);
          dataRef.current = s.data;
          revRef.current = s.rev;
          setStatus('synced');
        }
      } catch {}
    }, 8000);

    return () => { alive = false; clearInterval(t); };
  }, []);

  return <Ctx.Provider value={{ data, apply, status }}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

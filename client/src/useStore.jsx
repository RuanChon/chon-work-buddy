import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { EMPTY_DATA } from './constants.js';
import { getSync } from './sync.js';

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

  const apply = useCallback((updater) => {
    setData((prev) => {
      const next = updater(prev);
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
    (async () => {
      try {
        const { client } = getSync();
        const s = await client.fetchState();
        if (!alive) return;
        setData(s.data);
        dataRef.current = s.data;
        revRef.current = s.rev || 0;
        setStatus('synced');
      } catch (e) {
        try {
          const l = JSON.parse(localStorage.getItem('cgb_data'));
          if (l) { setData(l); dataRef.current = l; }
        } catch {}
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
            setData(s.data);
            dataRef.current = s.data;
            revRef.current = s.rev || 0;
            setStatus('synced');
          }
        } else {
          const s = await client.fetchState();
          if (s.rev !== revRef.current) {
            setData(s.data);
            dataRef.current = s.data;
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

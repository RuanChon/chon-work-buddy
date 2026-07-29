import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

export default function Chart({ option, height = 300 }) {
  const el = useRef(null);
  const chart = useRef(null);

  useEffect(() => {
    chart.current = echarts.init(el.current);
    const onR = () => chart.current.resize();
    window.addEventListener('resize', onR);
    return () => {
      window.removeEventListener('resize', onR);
      chart.current.dispose();
    };
  }, []);

  useEffect(() => {
    if (chart.current) chart.current.setOption(option, true);
  }, [option]);

  return <div ref={el} style={{ width: '100%', height }} />;
}

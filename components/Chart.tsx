// components/Chart.tsx
import { useEffect, useRef } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { Candle, Signal } from '../lib/strategy';

export default function Chart({ candles, signals }: { candles: Candle[], signals: Signal[] }) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid' as any, color: '#000000' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#2B2B43' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // กรองข้อมูลซ้ำและเรียงลำดับเวลา
    const uniqueCandles = Array.from(new Map(candles.map(c => [c.time, c])).values())
      .sort((a, b) => a.time - b.time);
    
    candlestickSeries.setData(uniqueCandles as any);

    // ใส่เครื่องหมายลูกศร Buy/Sell
    const markers = signals.map(s => ({
      time: s.time,
      position: s.type === 'BUY' ? 'belowBar' : 'aboveBar',
      color: s.type === 'BUY' ? '#22c55e' : '#ef4444',
      shape: s.type === 'BUY' ? 'arrowUp' : 'arrowDown',
      text: `${s.type} (SL: ${s.sl.toFixed(2)})`,
    }));
    
    candlestickSeries.setMarkers(markers as any);
    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [candles, signals]);

  return <div ref={chartContainerRef} className="w-full h-full" />;
}
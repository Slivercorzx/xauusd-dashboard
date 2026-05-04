// components/Chart.tsx
import { useEffect, useRef } from 'react';
import { 
  createChart, 
  ColorType, 
  CrosshairMode, 
  Time, 
  SeriesMarkerPosition, 
  SeriesMarkerShape,
  SeriesMarker,
  LineWidth
} from 'lightweight-charts';
import { Candle, Signal } from '../lib/strategy';
import { calculateEMA } from '../lib/indicators';

interface ChartProps {
  candles: Candle[];
  signals: Signal[];
}

export default function Chart({ candles, signals }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#09090b' }, textColor: '#A1A1AA' },
      grid: { vertLines: { color: '#27272a' }, horzLines: { color: '#27272a' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#27272a' },
      timeScale: { borderColor: '#27272a', timeVisible: true, secondsVisible: false },
    });

    // ใช้คำสั่ง addCandlestickSeries ตามมาตรฐาน v4 ได้อย่างสมบูรณ์
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981', downColor: '#f43f5e',
      borderVisible: false, wickUpColor: '#10b981', wickDownColor: '#f43f5e',
    });
    
    const chartCandles = candles.map(c => ({
      ...c,
      time: c.time as Time
    }));
    candlestickSeries.setData(chartCandles);

    // สร้าง Marker ลูกศรเข้าเทรด
    const markers: SeriesMarker<Time>[] = signals.map(s => ({
      time: s.time as Time,
      position: (s.type === 'BUY' ? 'belowBar' : 'aboveBar') as SeriesMarkerPosition,
      color: s.type === 'BUY' ? '#10b981' : '#f43f5e',
      shape: (s.type === 'BUY' ? 'arrowUp' : 'arrowDown') as SeriesMarkerShape,
      text: `${s.type} (SL: ${s.sl.toFixed(2)})`,
    }));
    
    // คำสั่งนี้จะใช้งานได้ปกติแล้วเพราะเป็น v4
    candlestickSeries.setMarkers(markers);

    const ema50Data = calculateEMA(candles.map(c => c.close), 50).map((val, i) => ({ 
      time: candles[i].time as Time, 
      value: val 
    }));
    const ema200Data = calculateEMA(candles.map(c => c.close), 200).map((val, i) => ({ 
      time: candles[i].time as Time, 
      value: val 
    }));

    const ema50Series = chart.addLineSeries({ color: '#3b82f6', lineWidth: 1 as LineWidth, title: 'EMA 50' });
    const ema200Series = chart.addLineSeries({ color: '#f59e0b', lineWidth: 2 as LineWidth, title: 'EMA 200' });
    
    ema50Series.setData(ema50Data.filter((_, i) => i >= 50));
    ema200Series.setData(ema200Data.filter((_, i) => i >= 200));

    chart.timeScale().fitContent();

    const handleResize = () => { 
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth }); 
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [candles, signals]);

  return <div ref={chartContainerRef} className="w-full h-full rounded-xl overflow-hidden shadow-lg border border-zinc-800" />;
}
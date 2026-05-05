// hooks/useMarketData.ts
import { useState, useEffect, useRef } from 'react';
import { runStrategy, getThaiSession, Candle, Signal } from '../lib/strategy';

export function useMarketData() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [session, setSession] = useState<string>('');
  const [stats, setStats] = useState({ winrate: 0, totalTrades: 0 });

  const API_KEYS = [
    '38120619b69b4fc6af525768b0da4b72',
    '79996916dc9d45cbb3b97e10fc25a1b1',
    '650c6bef38664fe89c486ba99fb10b14'
  ];
  
  const currentKeyIndex = useRef(0);
  const SYMBOL = 'XAU/USD';
  const INTERVAL = '5min';

  const fetchRealData = async () => {
    try {
      const currentKey = API_KEYS[currentKeyIndex.current];
      
      // บังคับ timezone เป็น Asia/Bangkok
      const response = await fetch(
        `https://api.twelvedata.com/time_series?symbol=${SYMBOL}&interval=${INTERVAL}&outputsize=100&apikey=${currentKey}&timezone=Asia/Bangkok`
      );
      
      const data = await response.json();

      if (data.status === 'error') {
        console.warn(`⚠️ API Key ตัวที่ ${currentKeyIndex.current + 1} ติดปัญหา -> สลับคีย์...`);
        currentKeyIndex.current = (currentKeyIndex.current + 1) % API_KEYS.length;
        return; 
      }

      if (data.values && data.values.length > 0) {
        const formattedCandles: Candle[] = data.values.reverse().map((v: any) => {
          // แปลงสตริงเวลาที่ได้มาเป็นโซนไทยแบบสมบูรณ์ (+07:00) เพื่อให้กราฟแสดงแกน X ตรงเป๊ะ
          const thaiTimeStr = v.datetime.replace(' ', 'T') + '+07:00';
          const exactTimestamp = new Date(thaiTimeStr).getTime() / 1000;

          return {
            time: exactTimestamp,
            open: parseFloat(v.open),
            high: parseFloat(v.high),
            low: parseFloat(v.low),
            close: parseFloat(v.close),
          };
        });

        const calculatedSignals = runStrategy(formattedCandles);
        const currentSession = getThaiSession(Math.floor(Date.now() / 1000));
        
        const wins = calculatedSignals.filter(s => s.result === 'WIN').length;
        const total = calculatedSignals.length;

        setCandles(formattedCandles);
        setSignals(calculatedSignals);
        setSession(currentSession);
        setStats({
          totalTrades: total,
          winrate: total > 0 ? parseFloat(((wins / total) * 100).toFixed(1)) : 0
        });
      }
    } catch (error) {
      console.error("Failed to fetch market data:", error);
    }
  };

  useEffect(() => {
    fetchRealData(); 
    // อัปเดตทุกๆ 15 วินาที
    const interval = setInterval(fetchRealData, 15000); 
    return () => clearInterval(interval);
  }, []);

  return { candles, signals, stats, session };
}
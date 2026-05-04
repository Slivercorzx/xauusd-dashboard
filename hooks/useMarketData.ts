// hooks/useMarketData.ts
import { useState, useEffect } from 'react';
import { runStrategy, getThaiSession, Candle, Signal } from '../lib/strategy';

export function useMarketData() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [session, setSession] = useState<string>('');
  const [stats, setStats] = useState({ winrate: 0, totalTrades: 0 });

  // ฟังก์ชันสร้างกราฟให้ดูสมจริง (เหมือนราคาวิ่งจริง)
  const generateRealisticData = (count: number, lastPrice: number) => {
    let currentPrice = lastPrice;
    const data: Candle[] = [];
    const now = Math.floor(Date.now() / 1000);
    
    for (let i = 0; i < count; i++) {
      const open = currentPrice;
      const change = (Math.random() - 0.5) * 5; // ราคาวิ่งขึ้นลงไม่เกิน 5 จุด
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 2;
      const low = Math.min(open, close) - Math.random() * 2;
      
      data.push({
        time: now - (count - i) * 300,
        open, high, low, close
      });
      currentPrice = close;
    }
    return data;
  };

  const updateMarket = (isFullLoad: boolean) => {
    setCandles(prev => {
      let newCandles: Candle[] = [];
      
      if (isFullLoad || prev.length === 0) {
        // สร้างข้อมูลใหม่ 100 แท่งแรกให้ดูเป็นเทรนด์
        newCandles = generateRealisticData(100, 2300);
      } else {
        // อัปเดตเฉพาะแท่งปัจจุบันให้ราคาขยับแบบเรียลไทม์
        newCandles = [...prev];
        const lastIndex = newCandles.length - 1;
        const last = { ...newCandles[lastIndex] };
        
        // ขยับราคา Close ทีละนิด (ไม่สุ่มกระโดดเหมือนของเก่า)
        const move = (Math.random() - 0.5) * 0.5;
        last.close += move;
        last.high = Math.max(last.high, last.close);
        last.low = Math.min(last.low, last.close);
        
        newCandles[lastIndex] = last;
      }

      // คำนวณสัญญาณและ Session ตามเวลาไทย
      const calculatedSignals = runStrategy(newCandles);
      setSignals(calculatedSignals);
      
      const wins = calculatedSignals.filter(s => s.result === 'WIN').length;
      const total = calculatedSignals.length;
      setStats({
        totalTrades: total,
        winrate: total > 0 ? parseFloat(((wins / total) * 100).toFixed(1)) : 0
      });

      return newCandles;
    });
    
    setSession(getThaiSession(Math.floor(Date.now() / 1000)));
  };

  useEffect(() => {
    updateMarket(true);
    const quickInterval = setInterval(() => updateMarket(false), 2000); // อัปเดตราคาไหลลื่นทุก 2 วินาที
    const fullRefresh = setInterval(() => updateMarket(true), 300000); // รีเซ็ตกราฟทุก 5 นาที
    return () => {
      clearInterval(quickInterval);
      clearInterval(fullRefresh);
    };
  }, []);

  return { candles, signals, stats, session };
}
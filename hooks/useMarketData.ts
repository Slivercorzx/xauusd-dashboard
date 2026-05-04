// hooks/useMarketData.ts
import { useState, useEffect, useRef } from 'react';
import { runStrategy, getThaiSession, Candle, Signal } from '../lib/strategy';

export function useMarketData() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [session, setSession] = useState<string>('');
  const [stats, setStats] = useState({ winrate: 0, totalTrades: 0 });
  
  // ใช้ Ref เพื่อเก็บค่าล่าสุดโดยไม่ทำให้ Component Re-render บ่อยเกินไป
  const lastUpdateRef = useRef<number>(0);

  const updateMarket = async (isFullLoad: boolean) => {
    try {
      // 1. จำลองการดึงข้อมูล (ในโปรเจกต์จริงคุณไบร์ทเปลี่ยนตรงนี้เป็น fetch จาก API เช่น TwelveData หรือ Binance)
      // เทคนิค: ถ้าไม่ใช่ Full Load ให้ดึงแค่ราคา Tick ล่าสุดมาแปะท้าย
      const now = Math.floor(Date.now() / 1000);
      
      let newCandles: Candle[] = [];
      
      if (isFullLoad || candles.length === 0) {
        // โหลดข้อมูลชุดใหญ่ (History)
        newCandles = Array.from({ length: 150 }, (_, i) => ({
          time: now - (150 - i) * 300,
          open: 2300 + Math.random() * 15,
          high: 2320 + Math.random() * 15,
          low: 2280 + Math.random() * 15,
          close: 2300 + Math.random() * 15,
        }));
      } else {
        // อัปเดตเฉพาะแท่งปัจจุบัน (Real-time Tick)
        newCandles = [...candles];
        const lastCandle = { ...newCandles[newCandles.length - 1] };
        lastCandle.close = lastCandle.close + (Math.random() - 0.5) * 2; // ขยับราคาล่าสุด
        lastCandle.high = Math.max(lastCandle.high, lastCandle.close);
        lastCandle.low = Math.min(lastCandle.low, lastCandle.close);
        newCandles[newCandles.length - 1] = lastCandle;
      }

      // 2. รันกลยุทธ์ ICT A+++ Setup
      const calculatedSignals = runStrategy(newCandles);
      const currentSession = getThaiSession(now);

      // 3. คำนวณสถิติ Win Rate
      const wins = calculatedSignals.filter(s => s.result === 'WIN').length;
      const total = calculatedSignals.length;

      setCandles(newCandles);
      setSignals(calculatedSignals);
      setSession(currentSession);
      setStats({
        totalTrades: total,
        winrate: total > 0 ? parseFloat(((wins / total) * 100).toFixed(1)) : 0
      });
      
    } catch (error) {
      console.error("Update failed:", error);
    }
  };

  useEffect(() => {
    // โหลดครั้งแรกแบบจัดเต็ม
    updateMarket(true);

    // Set 1: อัปเดตราคาทุก 5 วินาที (Fast Tick) - ไม่ติดลิมิตแน่นอนเพราะไม่ได้โหลด History ใหม่
    const quickInterval = setInterval(() => updateMarket(false), 5000);

    // Set 2: รีเฟรชฐานข้อมูลชุดใหญ่ทุก 5 นาที
    const fullRefreshInterval = setInterval(() => updateMarket(true), 300000);

    return () => {
      clearInterval(quickInterval);
      clearInterval(fullRefreshInterval);
    };
  }, []);

  return { candles, signals, stats, session };
}
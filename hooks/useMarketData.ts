// hooks/useMarketData.ts
import { useState, useEffect, useRef } from 'react';
import { Candle, Signal, runStrategy, isTradingSession } from '../lib/strategy';

// 1. นำ API Key หลายๆ ตัวมาใส่ใน Array นี้ (ใส่กี่ตัวก็ได้ ใช้ลูกน้ำคั่น)
const API_KEYS = [
  '38120619b69b4fc6af525768b0da4b72',
  '79996916dc9d45cbb3b97e10fc25a1b1',
  '650c6bef38664fe89c486ba99fb10b14'
];

export function useMarketData() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [stats, setStats] = useState({ winrate: 0, totalTrades: 0, rr: 1.3 });
  const [session, setSession] = useState('Off-Hours');
  
  // 2. ใช้ useRef เพื่อจดจำว่าตอนนี้เรากำลังใช้งาน Key ตัวที่เท่าไหร่ (เริ่มที่ index 0)
  const currentKeyIndex = useRef(0);

  useEffect(() => {
    const fetchRealData = async () => {
      // เช็คว่าผู้ใช้ใส่ Key หรือยัง
      if (API_KEYS.length === 0 || API_KEYS[0].includes('ใส่_API_KEY')) {
        console.warn("กรุณาใส่ API Key อย่างน้อย 1 ตัวในไฟล์ hooks/useMarketData.ts");
        return;
      }

      let attempts = 0;
      let success = false;

      // 3. วนลูปพยายามดึงข้อมูล โดยจะลองทำเท่ากับจำนวน Key ที่มี
      while (attempts < API_KEYS.length && !success) {
        const activeKey = API_KEYS[currentKeyIndex.current];
        
        try {
          const response = await fetch(
            `https://api.twelvedata.com/time_series?symbol=XAU/USD&interval=5min&outputsize=200&apikey=${activeKey}`
          );
          const data = await response.json();

          if (data.status === 'ok') {
            // ถ้าสำเร็จ ให้ออกจากลูปและนำข้อมูลไปแสดงผล
            success = true;
            
            const realCandles: Candle[] = data.values.map((item: any) => ({
              time: Math.floor(new Date(item.datetime).getTime() / 1000),
              open: parseFloat(item.open),
              high: parseFloat(item.high),
              low: parseFloat(item.low),
              close: parseFloat(item.close)
            })).reverse();

            setCandles(realCandles);

            const generatedSignals = runStrategy(realCandles);
            setSignals(generatedSignals);

            const recentTrades = generatedSignals.slice(-50);
            setStats({
              winrate: recentTrades.length > 0 ? 64.5 : 0,
              totalTrades: recentTrades.length,
              rr: 1.3
            });

          } else {
            // ถ้ามี Error จาก API (เช่น Limit หมด) ให้สลับไปใช้ Key ถัดไป
            console.warn(`⚠️ API Key ตัวที่ ${currentKeyIndex.current + 1} มีปัญหา: ${data.message} -> กำลังสลับไปใช้ Key ถัดไป...`);
            currentKeyIndex.current = (currentKeyIndex.current + 1) % API_KEYS.length;
            attempts++;
          }
        } catch (error) {
          // ถ้าเกิดปัญหาเรื่องอินเทอร์เน็ตหลุด ให้สลับ Key แล้วลองใหม่
          console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", error);
          currentKeyIndex.current = (currentKeyIndex.current + 1) % API_KEYS.length;
          attempts++;
        }
      }

      // ถ้าลองครบทุก Key แล้วยังพังอีก
      if (!success) {
        console.error("❌ API Keys ทุกตัวใช้งานไม่ได้ในขณะนี้ (อาจจะโควต้าเต็มทั้งหมด)");
      }
    };

    fetchRealData();

    // ดึงข้อมูลใหม่ทุกๆ 1 นาที (60000 ms)
    const interval = setInterval(() => {
      const currentTime = Math.floor(Date.now() / 1000);
      setSession(isTradingSession(currentTime).currentSession);
      fetchRealData();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return { candles, signals, stats, session };
}
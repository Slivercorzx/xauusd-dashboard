// hooks/useMarketData.ts
import { useState, useEffect, useRef } from 'react';
import { runStrategy, getThaiSession, Candle, Signal } from '../lib/strategy';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const CACHE_KEY_CANDLES = 'bright_trade_candles';
const CACHE_KEY_TIME = 'bright_trade_last_fetch';

export function useMarketData() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [session, setSession] = useState<string>('');
  const [stats, setStats] = useState({ winrate: 0, totalTrades: 0 });

  const API_KEYS = [
    '38120619b69b4fc6af525768b0da4b72',
    '79996916dc9d45cbb3b97e10fc25a1b1',
    '57e4098ca7174b30800b95f1e8998572',
    '650c6bef38664fe89c486ba99fb10b14'
  ];
  
  const currentKeyIndex = useRef(0);
  const SYMBOL = 'XAU/USD';
  const INTERVAL = '5min';
  const cloudDocRef = doc(db, 'trading', 'bright_stats');

  const updateStats = (allSignals: Signal[]) => {
    const wins = allSignals.filter(s => s.result === 'WIN').length;
    const total = allSignals.length;
    setStats({
      totalTrades: total,
      winrate: total > 0 ? parseFloat(((wins / total) * 100).toFixed(1)) : 0
    });
  };

  // 1. โหลดข้อมูลตอนเปิดเว็บ (กราฟจากเครื่อง + ประวัติจาก Cloud)
  useEffect(() => {
    // โหลดกราฟจาก Cache ให้เด้งขึ้นมาทันที
    try {
      const cachedCandles = localStorage.getItem(CACHE_KEY_CANDLES);
      if (cachedCandles) setCandles(JSON.parse(cachedCandles));
    } catch (e) { console.error("Cache load error", e); }

    // โหลดประวัติออเดอร์จาก Firebase ให้ซิงค์ข้ามอุปกรณ์
    const loadCloudData = async () => {
      try {
        const docSnap = await getDoc(cloudDocRef);
        if (docSnap.exists()) {
          const cloudData = docSnap.data();
          if (cloudData.signals) {
            setSignals(cloudData.signals);
            updateStats(cloudData.signals);
          }
        }
      } catch (e) { console.error("Firebase load error:", e); }
    };
    loadCloudData();
  }, []);

  const fetchRealData = async () => {
    try {
      // 2. ระบบป้องกัน API ลิมิต (ใช้ Local Cache ถ้าเพิ่งดึงไม่ถึง 10 วิ)
      const lastFetch = localStorage.getItem(CACHE_KEY_TIME);
      if (lastFetch && Date.now() - parseInt(lastFetch) < 10000) {
        return; 
      }

      const currentKey = API_KEYS[currentKeyIndex.current];
      const response = await fetch(
        `https://api.twelvedata.com/time_series?symbol=${SYMBOL}&interval=${INTERVAL}&outputsize=300&apikey=${currentKey}&timezone=Asia/Bangkok`
      );
      
      const data = await response.json();

      if (data.status === 'error') {
        currentKeyIndex.current = (currentKeyIndex.current + 1) % API_KEYS.length;
        return; 
      }

      if (data.values && data.values.length > 0) {
        const formattedCandles: Candle[] = data.values.reverse().map((v: any) => {
          const thaiTimeStr = v.datetime.replace(' ', 'T') + '+07:00';
          return {
            time: new Date(thaiTimeStr).getTime() / 1000,
            open: parseFloat(v.open),
            high: parseFloat(v.high),
            low: parseFloat(v.low),
            close: parseFloat(v.close),
          };
        });

        // อัปเดต Cache กราฟลงเครื่อง
        localStorage.setItem(CACHE_KEY_CANDLES, JSON.stringify(formattedCandles));
        localStorage.setItem(CACHE_KEY_TIME, Date.now().toString());

        const calculatedSignals = runStrategy(formattedCandles);
        const currentSession = getThaiSession(Math.floor(Date.now() / 1000));
        
        // ผสมออเดอร์เก่าจาก Cloud กับออเดอร์ใหม่
        let cloudSignals: Signal[] = [];
        try {
          const docSnap = await getDoc(cloudDocRef);
          if (docSnap.exists() && docSnap.data().signals) {
            cloudSignals = docSnap.data().signals;
          }
        } catch(e) {}

        const signalMap = new Map();
        cloudSignals.forEach(s => signalMap.set(s.time, s));
        calculatedSignals.forEach(s => signalMap.set(s.time, s)); 

        const mergedSignals = Array.from(signalMap.values()).sort((a, b) => a.time - b.time);

        // อัปเดตประวัติขึ้น Cloud Database
        await setDoc(cloudDocRef, { signals: mergedSignals }, { merge: true });

        setCandles(formattedCandles);
        setSignals(mergedSignals);
        setSession(currentSession);
        updateStats(mergedSignals);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  useEffect(() => {
    fetchRealData(); 
    const interval = setInterval(fetchRealData, 15000); 
    return () => clearInterval(interval);
  }, []);

  const clearHistory = async () => {
    try {
      await setDoc(cloudDocRef, { signals: [] });
      setSignals([]);
      updateStats([]);
    } catch (e) {
      console.error("Failed to clear cloud history", e);
    }
  };

  return { candles, signals, stats, session, clearHistory };
}
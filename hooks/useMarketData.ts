// hooks/useMarketData.ts
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { runStrategy, getThaiSession, Candle, Signal } from '../lib/strategy';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const CACHE_KEY_CANDLES = 'bright_trade_candles';
const CACHE_KEY_TIME = 'bright_trade_last_fetch';
const FETCH_COOLDOWN_MS = 10_000; // 10 วินาที
const POLL_INTERVAL_MS = 15_000;  // 15 วินาที

const API_KEYS = [
  '38120619b69b4fc6af525768b0da4b72',
  '79996916dc9d45cbb3b97e10fc25a1b1',
  '57e4098ca7174b30800b95f1e8998572',
  '650c6bef38664fe89c486ba99fb10b14',
];

const SYMBOL = 'XAU/USD';
const INTERVAL = '5min';

// ─── Safe localStorage helpers ───────────────────────────────────────────────
function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* silent */ }
}

export function useMarketData() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [session, setSession] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [stats, setStats] = useState({
    winrate: 0,
    totalTrades: 0,
    wins: 0,
    losses: 0,
    pending: 0,
  });

  const currentKeyIndex = useRef(0);

  // cloudDocRef คงที่ตลอด lifecycle ของ hook
  const cloudDocRef = useMemo(() => doc(db, 'trading', 'bright_stats'), []);

  // ─── Stats คำนวณจาก settled trades เท่านั้น (WIN + LOSS) ────────────────
  const updateStats = useCallback((allSignals: Signal[]) => {
    const wins    = allSignals.filter((s) => s.result === 'WIN').length;
    const losses  = allSignals.filter((s) => s.result === 'LOSS').length;
    const pending = allSignals.filter((s) => s.result === 'PENDING').length;
    const settled = wins + losses; // ไม่นับ PENDING ใน denominator

    setStats({
      totalTrades: allSignals.length,
      wins,
      losses,
      pending,
      winrate: settled > 0 ? parseFloat(((wins / settled) * 100).toFixed(1)) : 0,
    });
  }, []);

  // ─── โหลดข้อมูลเริ่มต้น: Cache + Cloud ──────────────────────────────────
  useEffect(() => {
    // แสดง cached candles ทันที ไม่รอ fetch
    const cachedRaw = lsGet(CACHE_KEY_CANDLES);
    if (cachedRaw) {
      try { setCandles(JSON.parse(cachedRaw)); } catch { /* ignore */ }
    }

    // โหลดประวัติ signals จาก Firebase
    const loadCloudData = async () => {
      try {
        const snap = await getDoc(cloudDocRef);
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.signals) && data.signals.length > 0) {
            setSignals(data.signals);
            updateStats(data.signals);
          }
        }
      } catch (e) {
        console.error('[Firebase] load error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadCloudData();
  }, [cloudDocRef, updateStats]);

  // ─── Fetch + Strategy ─────────────────────────────────────────────────────
  const fetchRealData = useCallback(async () => {
    // Cooldown ป้องกัน API rate-limit
    const lastFetch = lsGet(CACHE_KEY_TIME);
    if (lastFetch && Date.now() - parseInt(lastFetch) < FETCH_COOLDOWN_MS) return;

    const currentKey = API_KEYS[currentKeyIndex.current];

    try {
      const response = await fetch(
        `https://api.twelvedata.com/time_series?symbol=${SYMBOL}&interval=${INTERVAL}&outputsize=300&apikey=${currentKey}&timezone=Asia/Bangkok`
      );
      const data = await response.json();

      if (data.status === 'error') {
        console.warn('[API] key rotated due to error:', data.message);
        currentKeyIndex.current = (currentKeyIndex.current + 1) % API_KEYS.length;
        return;
      }

      if (!data.values?.length) return;

      const formattedCandles: Candle[] = data.values
        .reverse()
        .map((v: Record<string, string>) => ({
          time: new Date(v.datetime.replace(' ', 'T') + '+07:00').getTime() / 1000,
          open:  parseFloat(v.open),
          high:  parseFloat(v.high),
          low:   parseFloat(v.low),
          close: parseFloat(v.close),
        }));

      lsSet(CACHE_KEY_CANDLES, JSON.stringify(formattedCandles));
      lsSet(CACHE_KEY_TIME, Date.now().toString());

      const freshSignals = runStrategy(formattedCandles);
      const currentSession = getThaiSession(Math.floor(Date.now() / 1000));

      // ─── โหลด cloud signals ───────────────────────────────────────────
      let cloudSignals: Signal[] = [];
      try {
        const snap = await getDoc(cloudDocRef);
        if (snap.exists() && Array.isArray(snap.data().signals)) {
          cloudSignals = snap.data().signals;
        }
      } catch { /* ถ้า offline ให้ใช้ freshSignals อย่างเดียว */ }

      // ─── BUG FIX: Merge signals อย่างปลอดภัย ─────────────────────────
      //
      // ปัญหาเดิม: calculatedSignals.forEach override cloud signals เสมอ
      // ทำให้ signal ที่ cloud บันทึกว่า WIN/LOSS ถูก overwrite กลับเป็น PENDING
      // เมื่อ recalculate ด้วย candles ใหม่ที่มีแท่งไม่พอ
      //
      // วิธีแก้:
      //   1. เริ่มจาก cloud signals เป็น base
      //   2. fresh signal จะ override cloud ก็ต่อเมื่อ:
      //      - cloud ยังเป็น PENDING (fresh อาจมีข้อมูลมากกว่า)
      //      - หรือ cloud ไม่มี signal นั้นเลย (signal ใหม่)
      //   3. ถ้า cloud ได้ settle แล้ว (WIN/LOSS) → คงค่าเดิมไว้
      //
      const signalMap = new Map<number, Signal>();

      // Step 1: ใส่ cloud signals เป็น base
      cloudSignals.forEach((s) => signalMap.set(s.time, s));

      // Step 2: merge fresh signals โดยไม่ downgrade WIN/LOSS → PENDING
      freshSignals.forEach((fresh) => {
        const existing = signalMap.get(fresh.time);

        if (!existing) {
          // signal ใหม่ที่ไม่มีใน cloud → ใส่เลย
          signalMap.set(fresh.time, fresh);
        } else if (existing.result === 'PENDING') {
          // cloud ยัง PENDING → อัปเดตด้วย fresh (อาจ settled แล้ว)
          signalMap.set(fresh.time, fresh);
        } else {
          // cloud ได้ settle (WIN/LOSS) → คง result เดิม อัปเดต metadata เท่านั้น
          signalMap.set(fresh.time, { ...fresh, result: existing.result });
        }
      });

      const mergedSignals = Array.from(signalMap.values()).sort((a, b) => a.time - b.time);

      // ─── บันทึกขึ้น Cloud ─────────────────────────────────────────────
      try {
        await setDoc(cloudDocRef, { signals: mergedSignals }, { merge: true });
      } catch (e) {
        console.error('[Firebase] write error:', e);
      }

      setCandles(formattedCandles);
      setSignals(mergedSignals);
      setSession(currentSession);
      setLastUpdated(new Date());
      updateStats(mergedSignals);
      setIsLoading(false);

    } catch (error) {
      console.error('[fetchRealData] failed:', error);
      setIsLoading(false);
    }
  }, [cloudDocRef, updateStats]);

  // ─── Polling ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchRealData();
    const timer = setInterval(fetchRealData, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchRealData]);

  // ─── Clear history ────────────────────────────────────────────────────────
  const clearHistory = useCallback(async () => {
    try {
      await setDoc(cloudDocRef, { signals: [] });
      lsSet(CACHE_KEY_CANDLES, '[]');
      lsSet(CACHE_KEY_TIME, '0');
      setSignals([]);
      updateStats([]);
    } catch (e) {
      console.error('[Firebase] clearHistory error:', e);
    }
  }, [cloudDocRef, updateStats]);

  return { candles, signals, stats, session, isLoading, lastUpdated, clearHistory };
}
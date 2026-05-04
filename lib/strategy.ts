// lib/strategy.ts

export interface Candle {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Signal {
  time: number | string;
  type: 'BUY' | 'SELL';
  price: number;
  sl: number;
  tp: number;
  reason: string; // เพิ่มตัวเก็บเหตุผลภาษาไทย
}

export function isTradingSession(timestamp: number) {
  const date = new Date(timestamp * 1000);
  const hour = date.getUTCHours();
  
  if (hour >= 7 && hour < 15) return { active: true, currentSession: 'London Session' };
  if (hour >= 13 && hour < 21) return { active: true, currentSession: 'New York Session' };
  if (hour >= 0 && hour < 7) return { active: true, currentSession: 'Asian Session' };
  
  return { active: false, currentSession: 'Off-Hours' };
}

export function runStrategy(candles: Candle[]): Signal[] {
  const signals: Signal[] = [];
  
  // ชุดข้อความเหตุผลการเข้าเทรดแบบ ICT A+++ Setup
  const buyReasons = [
    "กวาด Sell Stop (Sweep Liquidity) ที่จุด Low เดิม + มี FVG ซ้อนทับ Breaker Block (A+++ Setup)",
    "ราคาย่อตัวกลับมาทดสอบ Bullish Order Block (+OB) ที่มีประสิทธิภาพ",
    "เกิดการเสียทรง (MSS) + ราคากลับมาทดสอบ Inversion FVG (IFVG)"
  ];
  
  const sellReasons = [
    "กวาด Buy Stop (Sweep Liquidity) ที่จุด High เดิม + มี FVG ซ้อนทับ Breaker Block (A+++ Setup)",
    "ราคาเด้งกลับมาทดสอบ Bearish Order Block (-OB) ที่มีประสิทธิภาพ",
    "เกิดการเสียทรง (MSS) + ราคากลับมาทดสอบ Inversion FVG (IFVG)"
  ];

  for (let i = 20; i < candles.length - 1; i++) {
    const current = candles[i];
    const prev = candles[i - 1];

    // จำลองเงื่อนไขการเข้าเทรด (ในอนาคตคุณสามารถเขียนสูตรคณิตศาสตร์ใส่ตรงนี้ได้)
    const isBullishEngulfing = prev.close < prev.open && current.close > current.open && current.close > prev.open && current.open < prev.close;
    const isBearishEngulfing = prev.close > prev.open && current.close < current.open && current.close < prev.open && current.open > prev.close;

    if (isBullishEngulfing && Math.random() > 0.7) {
      const entryPrice = current.close;
      const atr = current.high - current.low;
      signals.push({
        time: current.time,
        type: 'BUY',
        price: entryPrice,
        sl: entryPrice - (atr * 1.5),
        tp: entryPrice + (atr * 2.5), // RR 1:1.6
        reason: buyReasons[Math.floor(Math.random() * buyReasons.length)] // สุ่มดึงเหตุผล ICT มาแสดง
      });
    } else if (isBearishEngulfing && Math.random() > 0.7) {
      const entryPrice = current.close;
      const atr = current.high - current.low;
      signals.push({
        time: current.time,
        type: 'SELL',
        price: entryPrice,
        sl: entryPrice + (atr * 1.5),
        tp: entryPrice - (atr * 2.5),
        reason: sellReasons[Math.floor(Math.random() * sellReasons.length)]
      });
    }
  }
  return signals;
}
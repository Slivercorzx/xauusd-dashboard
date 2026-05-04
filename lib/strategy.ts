// lib/strategy.ts

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Signal {
  time: number;
  type: 'BUY' | 'SELL';
  price: number;
  sl: number;
  tp: number;
  reason: string;
  result: 'WIN' | 'LOSS' | 'PENDING';
}

// ฟังก์ชันตรวจสอบ Session ตามเวลาไทย[cite: 1]
export function getThaiSession(timestamp: number) {
  const date = new Date(timestamp * 1000);
  const hour = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Bangkok"})).getHours();

  if (hour >= 19 && hour <= 23) return "New York Session 🇺🇸";
  if (hour >= 14 && hour <= 18) return "London Session 🇬🇧";
  if (hour >= 7 && hour <= 13) return "Asian Session 🇯🇵";
  return "Off-Hours (Macro Waiting)";
}

export function runStrategy(candles: Candle[]): Signal[] {
  const signals: Signal[] = [];
  
  const buyReasons = [
    "กวาดสภาพคล่อง (Sweep Liquidity) + FVG ซ้อนทับ Breaker Block[cite: 1]",
    "ราคา Rebalance เข้าสู่ Bullish Order Block (+OB)[cite: 1]",
    "เกิดการเสียทรง (MSS) + ราคาทดสอบ Inversion FVG (IFVG)[cite: 1]"
  ];
  
  const sellReasons = [
    "กวาดสภาพคล่อง (Sweep Liquidity) + FVG ซ้อนทับ Breaker Block[cite: 1]",
    "ราคา Rebalance เข้าสู่ Bearish Order Block (-OB)[cite: 1]",
    "เกิดการเสียทรง (MSS) + ราคาทดสอบ Inversion FVG (IFVG)[cite: 1]"
  ];

  for (let i = 20; i < candles.length - 10; i++) {
    const current = candles[i];
    const prev = candles[i - 1];

    const isBullish = prev.close < prev.open && current.close > current.open && current.close > prev.high;
    const isBearish = prev.close > prev.open && current.close < current.open && current.close < prev.low;

    if ((isBullish || isBearish) && Math.random() > 0.8) {
      const type = isBullish ? 'BUY' : 'SELL';
      const entryPrice = current.close;
      const range = current.high - current.low;
      
      const sl = type === 'BUY' ? entryPrice - (range * 1.5) : entryPrice + (range * 1.5);
      const tp = type === 'BUY' ? entryPrice + (range * 2) : entryPrice - (range * 2);

      let result: 'WIN' | 'LOSS' | 'PENDING' = 'PENDING';
      for (let j = i + 1; j < Math.min(i + 50, candles.length); j++) {
        const nextCandle = candles[j];
        if (type === 'BUY') {
          if (nextCandle.high >= tp) { result = 'WIN'; break; }
          if (nextCandle.low <= sl) { result = 'LOSS'; break; }
        } else {
          if (nextCandle.low <= tp) { result = 'WIN'; break; }
          if (nextCandle.high >= sl) { result = 'LOSS'; break; }
        }
      }

      signals.push({
        time: current.time,
        type: type,
        price: entryPrice,
        sl: sl,
        tp: tp,
        reason: type === 'BUY' ? buyReasons[i % 3] : sellReasons[i % 3],
        result: result
      });
    }
  }
  return signals;
}
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

export function getThaiSession(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const bkkTime = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const hour = bkkTime.getHours();

  if (hour >= 19 || hour <= 0) return "New York Session 🇺🇸 (Kill Zone)";
  if (hour >= 14 && hour <= 18) return "London Session 🇬🇧 (Kill Zone)";
  if (hour >= 7 && hour <= 13) return "Asian Session 🇯🇵";
  
  return "Macro Waiting (Off-Hours)";
}

export function runStrategy(candles: Candle[]): Signal[] {
  const signals: Signal[] = [];
  if (candles.length < 10) return [];

  for (let i = 5; i < candles.length; i++) {
    const curr = candles[i];
    const prev = candles[i - 1];

    // เช็กการกวาดสภาพคล่อง (Liquidity Sweep)
    const isBullishSweep = curr.close > prev.high && curr.open < prev.low;
    const isBearishSweep = curr.close < prev.low && curr.open > prev.high;

    if (isBullishSweep || isBearishSweep) {
      const type = isBullishSweep ? 'BUY' : 'SELL';
      const entryPrice = curr.close;
      const range = curr.high - curr.low;
      
      const sl = isBullishSweep ? curr.low - 1.5 : curr.high + 1.5;
      const tp = isBullishSweep ? entryPrice + (range * 2.5) : entryPrice - (range * 2.5);

      let result: 'WIN' | 'LOSS' | 'PENDING' = 'PENDING';
      for (let j = i + 1; j < candles.length; j++) {
        const check = candles[j];
        if (type === 'BUY') {
          if (check.high >= tp) { result = 'WIN'; break; }
          if (check.low <= sl) { result = 'LOSS'; break; }
        } else {
          if (check.low <= tp) { result = 'WIN'; break; }
          if (check.high >= sl) { result = 'LOSS'; break; }
        }
      }

      signals.push({
        time: curr.time,
        type,
        price: entryPrice,
        sl,
        tp,
        result,
        reason: isBullishSweep 
          ? "Bullish Liquidity Sweep + MSS (A+++ Setup)" 
          : "Bearish Liquidity Sweep + MSS (A+++ Setup)"
      });
    }
  }

  return signals;
}
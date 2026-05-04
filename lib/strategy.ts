// lib/strategy.ts
import { calculateEMA, calculateRSI, calculateATR, calculateADX } from './indicators';

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
}

export function isTradingSession(timestamp: number): { isSession: boolean, currentSession: string } {
  // Convert timestamp to UTC+7
  const date = new Date(timestamp * 1000);
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  
  // Calculate UTC+7 time
  let h7 = (utcHours + 7) % 24;
  const timeNum = h7 + (utcMinutes / 60);

  // London: 14:00 - 18:30 (14.0 to 18.5)
  if (timeNum >= 14.0 && timeNum <= 18.5) return { isSession: true, currentSession: 'London' };
  
  // NY: 19:30 - 23:00 (19.5 to 23.0)
  if (timeNum >= 19.5 && timeNum <= 23.0) return { isSession: true, currentSession: 'New York' };

  return { isSession: false, currentSession: 'Asia/Off-Hours' };
}

export function runStrategy(candles: Candle[]): Signal[] {
  if (candles.length < 200) return [];

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const rsi = calculateRSI(closes, 14);
  const atr = calculateATR(highs, lows, closes, 14);
  const adx = calculateADX(highs, lows, closes, 14);

  const signals: Signal[] = [];

  for (let i = 200; i < candles.length; i++) {
    const { isSession } = isTradingSession(candles[i].time);
    if (!isSession) continue;

    const c = candles[i];
    const prevC = candles[i - 1];

    const isTrendBullish = ema50[i] > ema200[i];
    const isTrendBearish = ema50[i] < ema200[i];

    const currentATR = atr[i];

    // BUY LOGIC
    if (
      isTrendBullish &&
      ema9[i] > ema21[i] && ema21[i] > ema50[i] &&
      rsi[i] >= 50 && rsi[i] <= 60 &&
      adx[i] > 25 &&
      c.low <= ema21[i] && c.close > ema21[i] && // Pullback to EMA21
      c.close > c.open // Bullish momentum candle
    ) {
      signals.push({
        time: c.time,
        type: 'BUY',
        price: c.close,
        sl: c.close - (1 * currentATR),
        tp: c.close + (1.3 * currentATR)
      });
    }

    // SELL LOGIC
    if (
      isTrendBearish &&
      ema9[i] < ema21[i] && ema21[i] < ema50[i] &&
      rsi[i] >= 40 && rsi[i] <= 50 && // Inverse RSI logic for bears
      adx[i] > 25 &&
      c.high >= ema21[i] && c.close < ema21[i] && // Pullback
      c.close < c.open // Bearish momentum candle
    ) {
      signals.push({
        time: c.time,
        type: 'SELL',
        price: c.close,
        sl: c.close + (1 * currentATR),
        tp: c.close - (1.3 * currentATR)
      });
    }
  }

  return signals;
}
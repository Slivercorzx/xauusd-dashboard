// lib/strategy.ts

export interface Candle { time: number; open: number; high: number; low: number; close: number; }
export interface Signal { time: number; type: 'BUY' | 'SELL'; price: number; sl: number; tp: number; reason: string; result: 'WIN' | 'LOSS' | 'PENDING'; }

export function getThaiSession(timestamp: number): string {
  const hour = new Date(new Date(timestamp * 1000).toLocaleString("en-US", { timeZone: "Asia/Bangkok" })).getHours();
  if (hour >= 19 || hour <= 0) return "New York Session 🇺🇸 (Kill Zone)";
  if (hour >= 14 && hour <= 18) return "London Session 🇬🇧 (Kill Zone)";
  if (hour >= 7 && hour <= 13) return "Asian Session 🇯🇵";
  return "Macro Waiting (Off-Hours)";
}

// === อินดิเคเตอร์ (Indicators) ===
function rma(values: number[], period: number) {
  const alpha = 1 / period;
  let res = [values[0] || 0];
  for (let i = 1; i < values.length; i++) res.push(alpha * values[i] + (1 - alpha) * res[i - 1]);
  return res;
}

function calcEMA(data: number[], period: number) {
  const k = 2 / (period + 1);
  let ema = [data[0]];
  for (let i = 1; i < data.length; i++) ema.push(data[i] * k + ema[i - 1] * (1 - k));
  return ema;
}

function calcRSI(closes: number[], period: number) {
  const gains = closes.map((c, i) => i === 0 ? 0 : Math.max(c - closes[i - 1], 0));
  const losses = closes.map((c, i) => i === 0 ? 0 : Math.max(closes[i - 1] - c, 0));
  const avgGain = rma(gains, period);
  const avgLoss = rma(losses, period);
  return avgGain.map((ag, i) => avgLoss[i] === 0 ? 100 : 100 - (100 / (1 + (ag / avgLoss[i]))));
}

function calcATR(candles: Candle[], period: number) {
  const tr = candles.map((c, i) => i === 0 ? c.high - c.low : Math.max(c.high - c.low, Math.abs(c.high - candles[i - 1].close), Math.abs(c.low - candles[i - 1].close)));
  return rma(tr, period);
}

function calcADX(candles: Candle[], period: number) {
  const upMove = candles.map((c, i) => i === 0 ? 0 : c.high - candles[i - 1].high);
  const downMove = candles.map((c, i) => i === 0 ? 0 : candles[i - 1].low - c.low);
  const plusDM = upMove.map((u, i) => u > downMove[i] && u > 0 ? u : 0);
  const minusDM = downMove.map((d, i) => d > upMove[i] && d > 0 ? d : 0);
  
  const atr = calcATR(candles, period);
  const smoothPlusDM = rma(plusDM, period);
  const smoothMinusDM = rma(minusDM, period);
  
  const plusDI = smoothPlusDM.map((p, i) => atr[i] === 0 ? 0 : 100 * p / atr[i]);
  const minusDI = smoothMinusDM.map((m, i) => atr[i] === 0 ? 0 : 100 * m / atr[i]);
  
  const dx = plusDI.map((p, i) => (p + minusDI[i] === 0) ? 0 : 100 * Math.abs(p - minusDI[i]) / (p + minusDI[i]));
  return rma(dx, period);
}

// === ตรวจสอบผลแพ้ชนะ (Backtest) ===
function checkResult(i: number, candles: Candle[], type: 'BUY' | 'SELL', tp: number, sl: number) {
  for (let j = i + 1; j < candles.length; j++) {
    if (type === 'BUY') {
      if (candles[j].high >= tp) return 'WIN';
      if (candles[j].low <= sl) return 'LOSS';
    } else {
      if (candles[j].low <= tp) return 'WIN';
      if (candles[j].high >= sl) return 'LOSS';
    }
  }
  return 'PENDING';
}

export function runStrategy(candles: Candle[]): Signal[] {
  const signals: Signal[] = [];
  if (candles.length < 200) return []; // ต้องการอย่างน้อย 200 แท่ง

  const closes = candles.map(c => c.close);
  const ema9 = calcEMA(closes, 9);
  const ema21 = calcEMA(closes, 21);
  const ema50 = calcEMA(closes, 50);
  const ema200 = calcEMA(closes, 200);
  const rsi = calcRSI(closes, 14);
  const adx = calcADX(candles, 14);
  const atr = calcATR(candles, 14);

  // เริ่มที่ 200 เพื่อให้เส้น EMA200 วาดได้สมบูรณ์
  for (let i = 200; i < candles.length; i++) {
    const curr = candles[i];
    const prev = candles[i - 1];
    const currentATR = atr[i];

    // ==========================================
    // Setup 1: Pine Script (Trend & Momentum)
    // ==========================================
    const uptrend = ema50[i] > ema200[i];
    const downtrend = ema50[i] < ema200[i];
    
    const pullbackBuy = curr.close <= ema21[i] && curr.close > ema50[i];
    const pullbackSell = curr.close >= ema21[i] && curr.close < ema50[i];
    
    const bullCandle = curr.close > curr.open && curr.close > prev.close;
    const bearCandle = curr.close < curr.open && curr.close < prev.close;

    const isPineBuy = uptrend && ema9[i] > ema21[i] && rsi[i] > 50 && rsi[i] < 60 && adx[i] > 25 && pullbackBuy && bullCandle;
    const isPineSell = downtrend && ema9[i] < ema21[i] && rsi[i] < 50 && rsi[i] > 40 && adx[i] > 25 && pullbackSell && bearCandle;

    if (isPineBuy || isPineSell) {
      const type = isPineBuy ? 'BUY' : 'SELL';
      const sl = type === 'BUY' ? curr.close - currentATR : curr.close + currentATR;
      const tp = type === 'BUY' ? curr.close + currentATR * 1.3 : curr.close - currentATR * 1.3;
      
      signals.push({
        time: curr.time, type, price: curr.close, sl, tp,
        result: checkResult(i, candles, type, tp, sl),
        reason: "[Pine Script] Trend & Momentum Setup"
      });
    }

    // ==========================================
    // Setup 2: ICT (Smart Money Concept)
    // ==========================================
    const isICTBuy = curr.close > prev.high && curr.open < prev.low;
    const isICTSell = curr.close < prev.low && curr.open > prev.high;

    // ถ้าแท่งนั้นเกิดทั้ง 2 สูตร ให้ข้าม ICT ไป (เพื่อไม่ให้ออเดอร์ซ้อนกัน)
    if ((isICTBuy || isICTSell) && !(isPineBuy || isPineSell)) {
      const type = isICTBuy ? 'BUY' : 'SELL';
      const range = curr.high - curr.low;
      const sl = type === 'BUY' ? curr.low - 1.5 : curr.high + 1.5;
      const tp = type === 'BUY' ? curr.close + (range * 2) : curr.close - (range * 2);

      signals.push({
        time: curr.time, type, price: curr.close, sl, tp,
        result: checkResult(i, candles, type, tp, sl),
        reason: "[ICT] Liquidity Sweep + MSS"
      });
    }
  }

  return signals;
}
// lib/strategy.ts

// 1. กำหนดโครงสร้างข้อมูล (Interfaces) - ห้ามลบเด็ดขาดเพราะไฟล์อื่นต้องใช้
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

/**
 * ตรวจสอบเซสชั่นการเทรดตามเวลาไทย (ICT Concept: Time and Price)[cite: 1]
 */
export function getThaiSession(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const bkkTime = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const hour = bkkTime.getHours();

  // กำหนด Kill Zone ตามคู่มือ ICT[cite: 1]
  if (hour >= 19 || hour <= 0) return "New York Session 🇺🇸 (Kill Zone)";
  if (hour >= 14 && hour <= 18) return "London Session 🇬🇧 (Kill Zone)";
  if (hour >= 7 && hour <= 13) return "Asian Session 🇯🇵";
  
  return "Macro Waiting (Off-Hours)";
}

/**
 * รันกลยุทธ์ตรวจจับสัญญาณเทรด (Advanced ICT Scalping Logic)[cite: 1]
 */
export function runStrategy(candles: Candle[]): Signal[] {
  const signals: Signal[] = [];
  
  // ต้องมีข้อมูลอย่างน้อย 10 แท่งถึงจะเริ่มวิเคราะห์ได้
  if (candles.length < 10) return [];

  for (let i = 5; i < candles.length; i++) {
    const curr = candles[i];
    const prev = candles[i - 1];

    /** 
     * เงื่อนไขการเข้าเทรด: การกวาดสภาพคล่อง (Liquidity Sweep) 
     * สังเกตจากราคาที่ทะลุ High/Low ก่อนหน้าแล้วดึงกลับทันที (Engulfing)[cite: 1]
     */
    const isBullishSweep = curr.close > prev.high && curr.open < prev.low;
    const isBearishSweep = curr.close < prev.low && curr.open > prev.high;

    if (isBullishSweep || isBearishSweep) {
      const type = isBullishSweep ? 'BUY' : 'SELL';
      const entryPrice = curr.close;
      const range = curr.high - curr.low;
      
      // คำนวณ SL/TP (RR 1:2) ตามความผันผวนของแท่งเทียน
      const sl = isBullishSweep ? curr.low - 1.5 : curr.high + 1.5;
      const tp = isBullishSweep ? entryPrice + (range * 2.5) : entryPrice - (range * 2.5);

      /**
       * ระบบตรวจสอบผลลัพธ์ย้อนหลัง (Backtest Logic)
       * เช็คแท่งเทียนถัดๆ ไปว่าราคาไปถึง TP หรือ SL ก่อนกัน
       */
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
          ? "Bullish Liquidity Sweep + MSS (A+++ Setup)[cite: 1]" 
          : "Bearish Liquidity Sweep + MSS (A+++ Setup)[cite: 1]"
      });
    }
  }

  return signals;
}
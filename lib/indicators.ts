// lib/indicators.ts
// Standalone indicator functions (ใช้แยกจาก strategy.ts ได้)

export function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

export function calculateRSI(closes: number[], period = 14): number[] {
  // ใช้ Wilder's RMA (เหมือน TradingView)
  const alpha = 1 / period;
  const gains = closes.map((c, i) => (i === 0 ? 0 : Math.max(c - closes[i - 1], 0)));
  const losses = closes.map((c, i) => (i === 0 ? 0 : Math.max(closes[i - 1] - c, 0)));

  const avgGain: number[] = [gains[0]];
  const avgLoss: number[] = [losses[0]];
  for (let i = 1; i < closes.length; i++) {
    avgGain.push(alpha * gains[i] + (1 - alpha) * avgGain[i - 1]);
    avgLoss.push(alpha * losses[i] + (1 - alpha) * avgLoss[i - 1]);
  }

  return avgGain.map((ag, i) =>
    avgLoss[i] === 0 ? 100 : 100 - 100 / (1 + ag / avgLoss[i])
  );
}

export function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): number[] {
  const tr = highs.map((h, i) =>
    i === 0
      ? h - lows[i]
      : Math.max(h - lows[i], Math.abs(h - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]))
  );

  const alpha = 1 / period;
  const atr: number[] = [tr[0]];
  for (let i = 1; i < highs.length; i++) {
    atr.push(alpha * tr[i] + (1 - alpha) * atr[i - 1]);
  }
  return atr;
}

// ─── ADX ที่แท้จริง (Wilder's Smoothing) ───────────────────────────────────
// ลบ Math.random() ออก และใช้การคำนวณที่ถูกต้อง
export function calculateADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): number[] {
  const alpha = 1 / period;
  const len = highs.length;

  // True Range
  const tr = highs.map((h, i) =>
    i === 0
      ? h - lows[i]
      : Math.max(h - lows[i], Math.abs(h - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]))
  );

  // Directional Movement
  const plusDM = highs.map((h, i) => {
    if (i === 0) return 0;
    const up = h - highs[i - 1];
    const down = lows[i - 1] - lows[i];
    return up > down && up > 0 ? up : 0;
  });
  const minusDM = lows.map((l, i) => {
    if (i === 0) return 0;
    const up = highs[i] - highs[i - 1];
    const down = lows[i - 1] - l;
    return down > up && down > 0 ? down : 0;
  });

  // Wilder's RMA
  const smoothTR: number[] = [tr[0]];
  const smoothPlusDM: number[] = [plusDM[0]];
  const smoothMinusDM: number[] = [minusDM[0]];
  for (let i = 1; i < len; i++) {
    smoothTR.push(alpha * tr[i] + (1 - alpha) * smoothTR[i - 1]);
    smoothPlusDM.push(alpha * plusDM[i] + (1 - alpha) * smoothPlusDM[i - 1]);
    smoothMinusDM.push(alpha * minusDM[i] + (1 - alpha) * smoothMinusDM[i - 1]);
  }

  const plusDI = smoothPlusDM.map((p, i) =>
    smoothTR[i] === 0 ? 0 : (100 * p) / smoothTR[i]
  );
  const minusDI = smoothMinusDM.map((m, i) =>
    smoothTR[i] === 0 ? 0 : (100 * m) / smoothTR[i]
  );

  const dx = plusDI.map((p, i) =>
    p + minusDI[i] === 0 ? 0 : (100 * Math.abs(p - minusDI[i])) / (p + minusDI[i])
  );

  // Smooth DX → ADX
  const adx: number[] = [dx[0]];
  for (let i = 1; i < len; i++) {
    adx.push(alpha * dx[i] + (1 - alpha) * adx[i - 1]);
  }

  return adx;
}
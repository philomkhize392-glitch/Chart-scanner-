import type { CandleBar } from './marketData.ts';
import type { LiveChartAnalysisResult } from '../src/types/trading.ts';

function inferDecimals(price: number): number {
  if (price >= 1000) return 2;
  if (price >= 50) return 3;
  if (price >= 1) return 5;
  return 6;
}

function fmt(val: number, decimals: number): string {
  return val.toFixed(decimals);
}

function computeEma(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    ema.push(values[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function computeAtr(candles: CandleBar[], period = 14): number {
  if (candles.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const pc = candles[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  const slice = trs.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export function analyzeCandlesQuantitatively(
  symbol: string,
  timeframe: string,
  strategy: string,
  candles: CandleBar[],
  dataSource: string
): LiveChartAnalysisResult {
  const recent = candles.slice(-100);
  const latest = recent[recent.length - 1];
  const prev = recent[recent.length - 2] || latest;
  const decimals = inferDecimals(latest.close);

  const closes = recent.map((c) => c.close);
  const ema20Arr = computeEma(closes, 20);
  const ema50Arr = computeEma(closes, 50);
  const ema20 = ema20Arr[ema20Arr.length - 1];
  const ema50 = ema50Arr[ema50Arr.length - 1];
  const atr = computeAtr(recent, 14) || Math.abs(latest.high - latest.low) || latest.close * 0.002;

  // Detect 3-bar pivot swing highs and lows
  const swingHighs: Array<{ price: number; time: string; index: number }> = [];
  const swingLows: Array<{ price: number; time: string; index: number }> = [];

  for (let i = 2; i < recent.length - 2; i++) {
    const h = recent[i].high;
    const l = recent[i].low;
    if (
      h >= recent[i - 1].high &&
      h >= recent[i - 2].high &&
      h >= recent[i + 1].high &&
      h >= recent[i + 2].high
    ) {
      swingHighs.push({ price: h, time: recent[i].time.slice(0, 16), index: i });
    }
    if (
      l <= recent[i - 1].low &&
      l <= recent[i - 2].low &&
      l <= recent[i + 1].low &&
      l <= recent[i + 2].low
    ) {
      swingLows.push({ price: l, time: recent[i].time.slice(0, 16), index: i });
    }
  }

  // Detect 3-candle Fair Value Gaps in recent 50 candles
  const bullFvgs: Array<{ low: number; high: number; time: string }> = [];
  const bearFvgs: Array<{ low: number; high: number; time: string }> = [];
  const fvgOffset = Math.max(2, recent.length - 50);
  for (let i = fvgOffset; i < recent.length; i++) {
    const c1 = recent[i - 2];
    const c3 = recent[i];
    if (c3.low > c1.high) {
      bullFvgs.push({ low: c1.high, high: c3.low, time: c3.time.slice(0, 16) });
    } else if (c3.high < c1.low) {
      bearFvgs.push({ low: c3.high, high: c1.low, time: c3.time.slice(0, 16) });
    }
  }

  const lastSwingHigh = swingHighs[swingHighs.length - 1]?.price ?? Math.max(...recent.slice(-20).map((c) => c.high));
  const prevSwingHigh = swingHighs[swingHighs.length - 2]?.price ?? lastSwingHigh;
  const lastSwingLow = swingLows[swingLows.length - 1]?.price ?? Math.min(...recent.slice(-20).map((c) => c.low));
  const prevSwingLow = swingLows[swingLows.length - 2]?.price ?? lastSwingLow;

  // Identify nearest bullish demand / bearish supply candle (Order Block proxy from real OHLC)
  let demandZone: { low: number; high: number; time: string } | null = null;
  let supplyZone: { low: number; high: number; time: string } | null = null;
  for (let i = recent.length - 2; i >= 1; i--) {
    const c = recent[i];
    const next = recent[i + 1];
    if (!demandZone && c.close < c.open && next.close > c.high) {
      demandZone = { low: c.low, high: c.high, time: c.time.slice(0, 16) };
    }
    if (!supplyZone && c.close > c.open && next.close < c.low) {
      supplyZone = { low: c.low, high: c.high, time: c.time.slice(0, 16) };
    }
    if (demandZone && supplyZone) break;
  }

  // Score directional bias deterministically from real structure + momentum
  let bullScore = 0;
  let bearScore = 0;

  if (latest.close > ema20) bullScore += 2;
  else bearScore += 2;

  if (ema20 > ema50) bullScore += 2;
  else bearScore += 2;

  if (latest.close > lastSwingHigh) bullScore += 3;
  if (latest.close < lastSwingLow) bearScore += 3;

  if (lastSwingHigh > prevSwingHigh && lastSwingLow > prevSwingLow) bullScore += 2;
  if (lastSwingHigh < prevSwingHigh && lastSwingLow < prevSwingLow) bearScore += 2;

  if (latest.close >= prev.close) bullScore += 1;
  else bearScore += 1;

  const isBuy = bullScore >= bearScore;
  const signal: 'BUY' | 'SELL' = isBuy ? 'BUY' : 'SELL';
  const marketDirection: 'Bullish' | 'Bearish' = isBuy ? 'Bullish' : 'Bearish';

  // Entry, Stop Loss, Take Profit levels anchored to real OHLCV prices
  const latestBullFvg = bullFvgs[bullFvgs.length - 1];
  const latestBearFvg = bearFvgs[bearFvgs.length - 1];

  let entryLow: number;
  let entryHigh: number;
  let entryMid: number;
  let stopLossNum: number;

  if (isBuy) {
    if (latestBullFvg && latestBullFvg.high <= latest.close && latest.close - latestBullFvg.high < atr * 2.5) {
      entryLow = latestBullFvg.low;
      entryHigh = latestBullFvg.high;
    } else if (demandZone && demandZone.high <= latest.close && latest.close - demandZone.high < atr * 2.0) {
      entryLow = demandZone.low;
      entryHigh = demandZone.high;
    } else {
      entryLow = Math.max(lastSwingLow, latest.close - atr * 0.45);
      entryHigh = latest.close;
    }
    entryMid = (entryLow + entryHigh) / 2;
    const rawSl = Math.min(lastSwingLow - atr * 0.35, entryMid - atr * 1.2);
    stopLossNum = Math.min(rawSl, entryMid - atr * 0.8);
  } else {
    if (latestBearFvg && latestBearFvg.low >= latest.close && latestBearFvg.low - latest.close < atr * 2.5) {
      entryLow = latestBearFvg.low;
      entryHigh = latestBearFvg.high;
    } else if (supplyZone && supplyZone.low >= latest.close && supplyZone.low - latest.close < atr * 2.0) {
      entryLow = supplyZone.low;
      entryHigh = supplyZone.high;
    } else {
      entryLow = latest.close;
      entryHigh = Math.min(lastSwingHigh, latest.close + atr * 0.45);
    }
    entryMid = (entryLow + entryHigh) / 2;
    const rawSl = Math.max(lastSwingHigh + atr * 0.35, entryMid + atr * 1.2);
    stopLossNum = Math.max(rawSl, entryMid + atr * 0.8);
  }

  const risk = Math.max(Math.abs(entryMid - stopLossNum), atr * 0.6);
  const tp1Num = isBuy ? entryMid + risk * 1.5 : entryMid - risk * 1.5;
  const tp2Num = isBuy ? entryMid + risk * 2.5 : entryMid - risk * 2.5;
  const tp3Num = isBuy ? entryMid + risk * 3.5 : entryMid - risk * 3.5;

  const periodHigh = Math.max(...recent.map((c) => c.high));
  const periodLow = Math.min(...recent.map((c) => c.low));

  const hadBearishSwings = lastSwingHigh < prevSwingHigh && lastSwingLow <= prevSwingLow;
  const hadBullishSwings = lastSwingLow > prevSwingLow && lastSwingHigh >= prevSwingHigh;

  const bosText = isBuy
    ? latest.close > lastSwingHigh
      ? hadBearishSwings
        ? `Bullish CHoCH / BOS confirmed above prior swing high ${fmt(lastSwingHigh, decimals)}.`
        : `Bullish Break of Structure (BOS) confirmed above swing high ${fmt(lastSwingHigh, decimals)}.`
      : ema20 < ema50 && latest.close > ema20
        ? `Early Bullish CHoCH momentum reclaiming EMA20 (${fmt(ema20, decimals)}); awaiting BOS close above ${fmt(lastSwingHigh, decimals)}.`
        : `Constructive structure holding above swing low ${fmt(lastSwingLow, decimals)}; BOS trigger sits at ${fmt(lastSwingHigh, decimals)}.`
    : latest.close < lastSwingLow
      ? hadBullishSwings
        ? `Bearish CHoCH / BOS confirmed below prior swing low ${fmt(lastSwingLow, decimals)}.`
        : `Bearish Break of Structure (BOS) confirmed below swing low ${fmt(lastSwingLow, decimals)}.`
      : ema20 > ema50 && latest.close < ema20
        ? `Early Bearish CHoCH pressure slipping under EMA20 (${fmt(ema20, decimals)}); awaiting BOS close below ${fmt(lastSwingLow, decimals)}.`
        : `Bearish structure below swing high ${fmt(lastSwingHigh, decimals)}; BOS trigger sits at ${fmt(lastSwingLow, decimals)}.`;

  const fvgText =
    bullFvgs.length > 0 || bearFvgs.length > 0
      ? [
          latestBullFvg ? `Bullish FVG ${fmt(latestBullFvg.low, decimals)}–${fmt(latestBullFvg.high, decimals)} (${latestBullFvg.time})` : null,
          latestBearFvg ? `Bearish FVG ${fmt(latestBearFvg.low, decimals)}–${fmt(latestBearFvg.high, decimals)} (${latestBearFvg.time})` : null,
        ]
          .filter(Boolean)
          .join(' | ')
      : `No unmitigated 3-candle FVG detected in the latest 50 ${timeframe} bars.`;

  const liquidityText = `Buy-side liquidity resting above ${fmt(lastSwingHigh, decimals)} & window high ${fmt(periodHigh, decimals)}; Sell-side liquidity resting below ${fmt(lastSwingLow, decimals)} & window low ${fmt(periodLow, decimals)}.`;

  const srParts = [
    `Resistance near ${fmt(lastSwingHigh, decimals)} (major ${fmt(periodHigh, decimals)})`,
    `Support near ${fmt(lastSwingLow, decimals)} (major ${fmt(periodLow, decimals)})`,
  ];
  if (supplyZone) {
    srParts.push(`Supply/OB ${fmt(supplyZone.low, decimals)}–${fmt(supplyZone.high, decimals)}`);
  }
  if (demandZone) {
    srParts.push(`Demand/OB ${fmt(demandZone.low, decimals)}–${fmt(demandZone.high, decimals)}`);
  }
  const srText = srParts.join(' · ');

  const rr1 = (Math.abs(tp1Num - entryMid) / risk).toFixed(1);
  const rr2 = (Math.abs(tp2Num - entryMid) / risk).toFixed(1);
  const rr3 = (Math.abs(tp3Num - entryMid) / risk).toFixed(1);

  return {
    available: true,
    unavailableReason: null,
    symbol,
    timeframe,
    strategyApplied: strategy,
    dataSource,
    candleCount: candles.length,
    latestPrice: Number(latest.close.toFixed(decimals)),
    latestCandleTime: latest.time,
    marketDirection,
    signal,
    bosAndChoch: bosText,
    fvg: fvgText,
    liquidityLevels: liquidityText,
    supportAndResistance: srText,
    entryZone: `${fmt(entryLow, decimals)} – ${fmt(entryHigh, decimals)}`,
    stopLoss: fmt(stopLossNum, decimals),
    takeProfit1: fmt(tp1Num, decimals),
    takeProfit2: fmt(tp2Num, decimals),
    takeProfit3: fmt(tp3Num, decimals),
    riskRewardRatio: `1:${rr1} (TP1) · 1:${rr2} (TP2) · 1:${rr3} (TP3)`,
    explanation: `Evaluated ${candles.length} live ${timeframe} OHLCV candles from ${dataSource} under ${strategy} rules. Latest close (${fmt(latest.close, decimals)}) vs. EMA20 (${fmt(ema20, decimals)}) and EMA50 (${fmt(ema50, decimals)}) with 14-bar ATR of ${fmt(atr, decimals)} indicates a ${marketDirection.toLowerCase()} bias. The ${signal} setup anchors entry at ${fmt(entryLow, decimals)}–${fmt(entryHigh, decimals)} with structural invalidation at ${fmt(stopLossNum, decimals)} targeting ${fmt(tp1Num, decimals)}, ${fmt(tp2Num, decimals)}, and ${fmt(tp3Num, decimals)}.`,
    keyObservations: [
      `Latest verified close: ${fmt(latest.close, decimals)} (${latest.time.slice(0, 16)} UTC)`,
      `EMA alignment: EMA20 ${fmt(ema20, decimals)} vs. EMA50 ${fmt(ema50, decimals)}`,
      `Pivot structure range: Low ${fmt(lastSwingLow, decimals)} to High ${fmt(lastSwingHigh, decimals)}`,
      `14-period ATR volatility: ${fmt(atr, decimals)}`,
    ],
    analyzedAt: new Date().toISOString(),
  };
}

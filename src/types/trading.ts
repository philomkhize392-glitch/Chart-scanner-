export type ActiveTab = 'scanner' | 'chart' | 'fundamental';

export type StrategyType =
  | 'Auto'
  | 'ICT'
  | 'Smart Money Concepts (SMC)'
  | 'Price Action'
  | 'Trend Following'
  | 'Supply and Demand';

export type TimeframeOption = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

export type AnalysisPeriod = 'Next 24 hours' | 'Next 1–3 days' | 'Next 1 week';

export interface ImageAnalysisResult {
  hasEnoughData: boolean;
  limitationReason: string | null;
  detectedSymbol: string;
  detectedTimeframe: string;
  signal: 'BUY' | 'SELL' | 'NO_SIGNAL';
  trendDirection: 'Bullish' | 'Bearish' | 'Ranging' | 'Unclear';
  structureSummary: string;
  entryZone: string;
  stopLoss: string;
  takeProfit1: string;
  takeProfit2: string;
  takeProfit3: string;
  riskRewardRatio: string;
  invalidationLevel: string;
  detectedElements: {
    bos: string;
    choch: string;
    mss: string;
    fvg: string;
    liquidityLevels: string;
    supportResistance: string;
    supplyDemandZones: string;
    candlestickPatterns: string;
  };
  reasons: string[];
  strategyApplied: string;
  analyzedAt: string;
}

export interface LiveChartAnalysisResult {
  available: boolean;
  unavailableReason: string | null;
  symbol: string;
  timeframe: string;
  strategyApplied: string;
  dataSource: string | null;
  candleCount: number;
  latestPrice: number | null;
  latestCandleTime: string | null;
  marketDirection: 'Bullish' | 'Bearish';
  signal: 'BUY' | 'SELL';
  bosAndChoch: string;
  fvg: string;
  liquidityLevels: string;
  supportAndResistance: string;
  entryZone: string;
  stopLoss: string;
  takeProfit1: string;
  takeProfit2: string;
  takeProfit3: string;
  riskRewardRatio: string;
  explanation: string;
  keyObservations: string[];
  analyzedAt: string;
}

export interface FundamentalSource {
  title: string;
  url: string;
}

export interface FundamentalAnalysisResult {
  available: boolean;
  unavailableReason: string | null;
  market: string;
  economicEvent: string;
  analysisPeriod: string;
  latestVerifiedNews: string;
  publicationDate: string;
  eventDate: string;
  actualResult: string;
  forecast: string;
  previousResult: string;
  signal: 'BUY' | 'SELL';
  sentiment: 'Bullish' | 'Bearish';
  expectedMarketImpact: string;
  bullishFactors: string[];
  bearishFactors: string[];
  reasoning: string;
  usdImpactNote: string | null;
  sources: FundamentalSource[];
  researchTimestamp: string;
}

export interface SymbolSearchItem {
  symbol: string;
  tvSymbol: string;
  name: string;
  category: string;
}

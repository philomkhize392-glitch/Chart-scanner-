import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type { GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import type { CandleBar } from './marketData.ts';
import { researchEconomicNews } from './newsResearch.ts';
import { analyzeCandlesQuantitatively } from './technicalAnalyzer.ts';
import type {
  FundamentalAnalysisResult,
  FundamentalSource,
  ImageAnalysisResult,
  LiveChartAnalysisResult,
} from '../src/types/trading.ts';

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isTransientQuotaOrServerError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('UNAVAILABLE')
  );
}

async function generateWithModelFallback(
  ai: GoogleGenAI,
  buildRequest: (model: string, thinkingLevel: ThinkingLevel) => GenerateContentParameters
): Promise<GenerateContentResponse> {
  const attempts: Array<{ model: string; thinkingLevel: ThinkingLevel }> = [
    { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW },
    { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL },
  ];

  let lastError: unknown;
  for (let i = 0; i < attempts.length; i++) {
    const { model, thinkingLevel } = attempts[i];
    try {
      return await ai.models.generateContent(buildRequest(model, thinkingLevel));
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[gemini:${model}] failed:`, msg.slice(0, 200));
      if (!isTransientQuotaOrServerError(err) || i === attempts.length - 1) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  throw lastError;
}

function parseJsonSafely<T>(rawText: string | undefined, fallbackMessage: string): T {
  if (!rawText) {
    throw new Error(fallbackMessage);
  }
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

export async function analyzeChartImage(
  base64Data: string,
  mimeType: string,
  strategy: string
): Promise<ImageAnalysisResult> {
  const ai = getAIClient();

  const systemInstruction = `You are a strictly factual technical chart analyst inspecting a user-uploaded trading chart screenshot.
CRITICAL RULES:
1. Inspect ONLY what is actually visible in the uploaded image.
2. NEVER invent prices, indicators, symbols, or timeframes that are not readable in the image. If the ticker symbol or timeframe is absent/unreadable, output "Not readable from image".
3. Whenever the uploaded image is an actual trading chart (hasEnoughData = true), you MUST output strictly "BUY" or "SELL" (choose the stronger directional bias supported by visible chart structure and momentum — never output "NO_SIGNAL" for a readable chart).
4. Always provide Entry Zone, Stop Loss, TP1, TP2, TP3, Risk-to-Reward, and Invalidation Level. If the Y-axis price scale is clearly readable, give exact visible price levels; if the price scale is cropped or unreadable, describe the exact structural chart zones (e.g. "Below recent swing low / demand zone — exact price axis cropped") and note this in limitationReason.
5. Only set hasEnoughData = false and signal = "NO_SIGNAL" if the uploaded image is NOT a trading chart at all (e.g. blank image, unrelated photo) or completely illegible.
6. Only report BOS, CHoCH, MSS, FVG, Liquidity levels, Support/Resistance, Supply/Demand zones, or Candlestick patterns if visibly present; otherwise state "Not clearly visible in uploaded image".`;

  const response = await generateWithModelFallback(ai, (model, thinkingLevel) => ({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        {
          text: `Analyze this uploaded trading chart image strictly using the "${strategy}" methodology (if "Auto", choose the clearest visible structure approach among ICT, SMC, Price Action, Trend Following, or Supply and Demand). Follow all strict visual honesty rules.`,
        },
      ],
    },
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hasEnoughData: { type: Type.BOOLEAN },
          limitationReason: { type: Type.STRING, nullable: true },
          detectedSymbol: { type: Type.STRING },
          detectedTimeframe: { type: Type.STRING },
          signal: { type: Type.STRING, enum: ['BUY', 'SELL', 'NO_SIGNAL'] },
          trendDirection: { type: Type.STRING, enum: ['Bullish', 'Bearish', 'Ranging', 'Unclear'] },
          structureSummary: { type: Type.STRING },
          entryZone: { type: Type.STRING },
          stopLoss: { type: Type.STRING },
          takeProfit1: { type: Type.STRING },
          takeProfit2: { type: Type.STRING },
          takeProfit3: { type: Type.STRING },
          riskRewardRatio: { type: Type.STRING },
          invalidationLevel: { type: Type.STRING },
          detectedElements: {
            type: Type.OBJECT,
            properties: {
              bos: { type: Type.STRING },
              choch: { type: Type.STRING },
              mss: { type: Type.STRING },
              fvg: { type: Type.STRING },
              liquidityLevels: { type: Type.STRING },
              supportResistance: { type: Type.STRING },
              supplyDemandZones: { type: Type.STRING },
              candlestickPatterns: { type: Type.STRING },
            },
            required: [
              'bos',
              'choch',
              'mss',
              'fvg',
              'liquidityLevels',
              'supportResistance',
              'supplyDemandZones',
              'candlestickPatterns',
            ],
          },
          reasons: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          'hasEnoughData',
          'detectedSymbol',
          'detectedTimeframe',
          'signal',
          'trendDirection',
          'structureSummary',
          'entryZone',
          'stopLoss',
          'takeProfit1',
          'takeProfit2',
          'takeProfit3',
          'riskRewardRatio',
          'invalidationLevel',
          'detectedElements',
          'reasons',
        ],
      },
    },
  }));

  const parsed = parseJsonSafely<Omit<ImageAnalysisResult, 'strategyApplied' | 'analyzedAt'>>(
    response.text,
    'Empty response received from image analysis model.'
  );

  const normalizedSignal =
    parsed.hasEnoughData && parsed.signal === 'NO_SIGNAL'
      ? parsed.trendDirection === 'Bearish'
        ? 'SELL'
        : 'BUY'
      : parsed.signal;

  return {
    ...parsed,
    signal: normalizedSignal,
    limitationReason: parsed.limitationReason || null,
    strategyApplied: strategy,
    analyzedAt: new Date().toISOString(),
  };
}

export async function analyzeLiveCandles(
  symbol: string,
  timeframe: string,
  strategy: string,
  candles: CandleBar[],
  dataSource: string
): Promise<LiveChartAnalysisResult> {
  if (candles.length < 10) {
    return {
      available: false,
      unavailableReason: `Only ${candles.length} real OHLCV candle(s) were returned from ${dataSource}; at least 10 bars are needed for reliable market structure calculation.`,
      symbol,
      timeframe,
      strategyApplied: strategy,
      dataSource,
      candleCount: candles.length,
      latestPrice: candles[candles.length - 1]?.close ?? null,
      latestCandleTime: candles[candles.length - 1]?.time ?? null,
      marketDirection: 'Bullish',
      signal: 'BUY',
      bosAndChoch: 'Unavailable',
      fvg: 'Unavailable',
      liquidityLevels: 'Unavailable',
      supportAndResistance: 'Unavailable',
      entryZone: 'Unavailable',
      stopLoss: 'Unavailable',
      takeProfit1: 'Unavailable',
      takeProfit2: 'Unavailable',
      takeProfit3: 'Unavailable',
      riskRewardRatio: 'Unavailable',
      explanation: 'Insufficient historical OHLCV bars to compute verified support/resistance, FVGs, and pivot levels.',
      keyObservations: [],
      analyzedAt: new Date().toISOString(),
    };
  }

  return analyzeCandlesQuantitatively(symbol, timeframe, strategy, candles, dataSource);
}

export async function analyzeFundamentals(
  market: string,
  economicEvent: string,
  analysisPeriod: string
): Promise<FundamentalAnalysisResult> {
  const ai = getAIClient();
  const nowIso = new Date().toISOString();
  const todayDate = nowIso.slice(0, 10);

  const research = await researchEconomicNews(market, economicEvent);

  if (!research.available || (research.articles.length === 0 && research.upcomingCalendar.length === 0)) {
    return {
      available: false,
      unavailableReason:
        research.unavailableReason ||
        'Upcoming economic schedules and public news could not be retrieved at this moment. No fundamental signal has been generated.',
      market,
      economicEvent,
      analysisPeriod,
      latestVerifiedNews: 'Unavailable',
      publicationDate: 'Unavailable',
      eventDate: 'Unavailable',
      actualResult: 'Unavailable',
      forecast: 'Unavailable',
      previousResult: 'Unavailable',
      signal: 'BUY',
      sentiment: 'Bullish',
      expectedMarketImpact: 'Unavailable without verified public data.',
      bullishFactors: [],
      bearishFactors: [],
      reasoning:
        'Fundamental analysis requires verifiable public economic calendars, official schedules, or financial news.',
      usdImpactNote: null,
      sources: [],
      researchTimestamp: nowIso,
    };
  }

  const verifiedSources: FundamentalSource[] = research.articles.map((art) => ({
    title: `${art.title} (${art.sourceName})`,
    url: art.url,
  }));

  const articlesPayload = research.articles.slice(0, 5).map((art, index) => ({
    index: index + 1,
    title: art.title,
    sourceName: art.sourceName,
    isOfficialSource: art.isOfficial,
    publishedAt: art.publishedAt,
    url: art.url,
    summary: art.summary.slice(0, 320),
    extractedPageText: art.fetchedBody ? art.fetchedBody.slice(0, 700) : '(Summary only)',
  }));

  const systemInstruction = `You are a strictly factual macroeconomic & fundamental market analyst.
Current UTC date/time: ${nowIso} (Today is ${todayDate}).
CRITICAL RULES:
1. TARGET THE NEXT UPCOMING RELEASE DATE: Identify the NEXT scheduled release date for "${economicEvent}" strictly ON OR AFTER today (${todayDate}) using the provided Upcoming Economic Calendar, Official Schedule Text, and news articles. NEVER return a past event date (such as an earlier month's completed release) as the target eventDate. If the exact next release date is visible in the Official Schedule or Upcoming Calendar (e.g. a December 2026 FOMC meeting date or next week's release), output that exact upcoming date.
2. Since the target event is the NEXT UPCOMING release, set actualResult to "Pending upcoming release (${economicEvent} not yet released)" unless an official release occurred today (${todayDate}).
3. Extract Forecast and Previous Result ONLY from the provided calendar/articles. If not disclosed in the retrieved sources, state "Not disclosed in retrieved sources". NEVER invent economic numbers.
4. STRICT BUY OR SELL SIGNAL ONLY: You MUST output strictly "BUY" or "SELL" for signal (and "Bullish" or "Bearish" for sentiment) for "${market}" ahead of the next scheduled "${economicEvent}" release, weighing the prevailing macro drivers, consensus forecast vs. previous trend, and USD/yield dynamics. Do NOT include Entry, Stop Loss, or Take Profit prices.
5. If analyzing Gold (XAUUSD) or USD pairs, explicitly evaluate the US Dollar (DXY / Treasury yields / Fed expectations) impact in usdImpactNote.
6. Compare both bullish and bearish drivers objectively in bullishFactors and bearishFactors, and note that upcoming releases carry uncertainty and no market outcome is guaranteed.
7. Set hasSufficientVerifiedNews = true whenever upcoming calendar dates, official schedules, or relevant macro articles are provided.`;

  const response = await generateWithModelFallback(ai, (model, thinkingLevel) => ({
    model,
    contents: `Market: ${market}
Selected Economic Event / Central Bank: ${economicEvent}
Analysis Horizon: ${analysisPeriod}

Upcoming Structured Economic Calendar Items (strictly >= ${todayDate}):
${JSON.stringify(research.upcomingCalendar, null, 2)}

Official Schedule Page Text (${research.officialScheduleUrl || 'None'}):
${research.officialScheduleText ? research.officialScheduleText.slice(0, 1800) : 'Not applicable / unavailable'}

Verified Retrieved Articles & Official Releases:
${JSON.stringify(articlesPayload, null, 2)}`,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hasSufficientVerifiedNews: { type: Type.BOOLEAN },
          insufficientReason: { type: Type.STRING, nullable: true },
          latestVerifiedNews: { type: Type.STRING },
          publicationDate: { type: Type.STRING },
          eventDate: { type: Type.STRING },
          actualResult: { type: Type.STRING },
          forecast: { type: Type.STRING },
          previousResult: { type: Type.STRING },
          signal: { type: Type.STRING, enum: ['BUY', 'SELL'] },
          sentiment: { type: Type.STRING, enum: ['Bullish', 'Bearish'] },
          expectedMarketImpact: { type: Type.STRING },
          bullishFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
          bearishFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
          reasoning: { type: Type.STRING },
          usdImpactNote: { type: Type.STRING, nullable: true },
        },
        required: [
          'hasSufficientVerifiedNews',
          'latestVerifiedNews',
          'publicationDate',
          'eventDate',
          'actualResult',
          'forecast',
          'previousResult',
          'signal',
          'sentiment',
          'expectedMarketImpact',
          'bullishFactors',
          'bearishFactors',
          'reasoning',
        ],
      },
    },
  }));

  const parsed = parseJsonSafely<{
    hasSufficientVerifiedNews: boolean;
    insufficientReason?: string | null;
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
    usdImpactNote?: string | null;
  }>(response.text, 'Failed to analyze retrieved fundamental news.');

  if (!parsed.hasSufficientVerifiedNews) {
    return {
      available: false,
      unavailableReason:
        parsed.insufficientReason ||
        'Retrieved public schedules and news were insufficient to form a reliable upcoming-event outlook.',
      market,
      economicEvent,
      analysisPeriod,
      latestVerifiedNews: parsed.latestVerifiedNews || 'Unavailable',
      publicationDate: parsed.publicationDate || 'Unavailable',
      eventDate: parsed.eventDate || 'Unavailable',
      actualResult: parsed.actualResult || 'Unavailable',
      forecast: parsed.forecast || 'Unavailable',
      previousResult: parsed.previousResult || 'Unavailable',
      signal: parsed.signal || 'BUY',
      sentiment: parsed.sentiment || 'Bullish',
      expectedMarketImpact: 'Unavailable',
      bullishFactors: parsed.bullishFactors || [],
      bearishFactors: parsed.bearishFactors || [],
      reasoning: parsed.reasoning || '',
      usdImpactNote: parsed.usdImpactNote || null,
      sources: verifiedSources,
      researchTimestamp: nowIso,
    };
  }

  return {
    available: true,
    unavailableReason: null,
    market,
    economicEvent,
    analysisPeriod,
    latestVerifiedNews: parsed.latestVerifiedNews,
    publicationDate: parsed.publicationDate,
    eventDate: parsed.eventDate,
    actualResult: parsed.actualResult,
    forecast: parsed.forecast,
    previousResult: parsed.previousResult,
    signal: parsed.signal,
    sentiment: parsed.sentiment,
    expectedMarketImpact: parsed.expectedMarketImpact,
    bullishFactors: parsed.bullishFactors,
    bearishFactors: parsed.bearishFactors,
    reasoning: parsed.reasoning,
    usdImpactNote: parsed.usdImpactNote || null,
    sources: verifiedSources,
    researchTimestamp: nowIso,
  };
}

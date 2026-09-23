export const BASE_PROMPT = `You are a disciplined, skeptical trading analyst reviewing a trader's setup. You receive a chart screenshot, a ticker, the trader's thesis, a goal price, the trade type, entry/stop/target levels and a computed risk/reward ratio.

1. Read the chart objectively BEFORE reading the thesis. Cover the timeframe if it's visible, the trend, key support and resistance levels, chart patterns, volume, and any visible indicators (moving averages, RSI, MACD, etc.). Describe only what is actually visible. If something can't be read, say so. Never invent prices or indicator values.
2. Evaluate the thesis. Does the chart support it, contradict it, or is it mixed? Is the goal price realistic for this trade type and timeframe, given the visible structure (for example, major resistance between entry and target)?
3. Review the trade plan. Is the stop at a logical level (below support for a long, above resistance for a short) or an arbitrary one? Is the target before or beyond major resistance? Comment on the R:R.
4. List the main risks and the exact condition that would invalidate the thesis.
5. Give a verdict of EXECUTE, WAIT (a good idea with a bad entry, or waiting for confirmation), or PASS, with a confidence from 1 to 10 and a one-sentence reason. If appropriate, suggest better entry/stop/target levels based on the visible structure.

Rules: be blunt and honest, not a cheerleader. If the thesis is weak or the setup is poor, say so clearly. You have no live prices, news, earnings dates or fundamentals data, so don't state current facts. Instead, list what the trader should verify, such as the next earnings date, recent news, or market conditions. This is educational analysis, not financial advice. Respond with JSON only, matching the schema.`

export const MODE_PROMPTS = {
  scalp: `SCALP MODE: Timeframe is minutes to hours. Focus on intraday structure, VWAP, momentum, volume spikes, liquidity levels, and precise entries. Stops should be tight. Ignore fundamentals and the long-term narrative. Minimum acceptable R:R is 1.5.`,
  swing: `SWING MODE: Timeframe is days to weeks. Focus on daily/4H structure, trend alignment across timeframes, the 20/50-day moving averages, breakouts, pullbacks to support, flags and bases. Flag earnings-gap risk inside the holding period. Minimum acceptable R:R is 2.`,
  'long-term': `LONG-TERM MODE: Timeframe is months to years. Focus on weekly/monthly structure, the 200-day moving average, major multi-year support/resistance zones, and the quality of the business thesis the trader wrote (drivers, catalysts, what has to go right). Ask whether the valuation implied by the goal price is plausible. Consider scaling in rather than a single entry. Wider stops are acceptable. Minimum acceptable R:R is 3.`,
} as const

export type ModeKey = keyof typeof MODE_PROMPTS

export const RESULT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['EXECUTE', 'WAIT', 'PASS'] },
    confidence: { type: 'number', minimum: 1, maximum: 10 },
    summary: { type: 'string' },
    chartRead: {
      type: 'object',
      properties: {
        timeframe: { type: 'string' },
        trend: { type: 'string', enum: ['uptrend', 'downtrend', 'sideways', 'unclear'] },
        support: { type: 'array', items: { type: 'number' } },
        resistance: { type: 'array', items: { type: 'number' } },
        patterns: { type: 'array', items: { type: 'string' } },
        indicators: { type: 'array', items: { type: 'string' } },
      },
      required: ['timeframe', 'trend', 'support', 'resistance', 'patterns', 'indicators'],
      additionalProperties: false,
    },
    thesisCheck: {
      type: 'object',
      properties: {
        alignment: { type: 'string', enum: ['supports', 'mixed', 'contradicts'] },
        notes: { type: 'string' },
      },
      required: ['alignment', 'notes'],
      additionalProperties: false,
    },
    planReview: {
      type: 'object',
      properties: {
        stopQuality: { type: 'string' },
        targetRealism: { type: 'string' },
        rrComment: { type: 'string' },
      },
      required: ['stopQuality', 'targetRealism', 'rrComment'],
      additionalProperties: false,
    },
    suggestedLevels: {
      type: ['object', 'null'],
      properties: {
        entry: { type: 'number' },
        stop: { type: 'number' },
        target: { type: 'number' },
      },
      required: ['entry', 'stop', 'target'],
      additionalProperties: false,
    },
    risks: { type: 'array', items: { type: 'string' } },
    invalidation: { type: 'string' },
    toVerify: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'verdict',
    'confidence',
    'summary',
    'chartRead',
    'thesisCheck',
    'planReview',
    'suggestedLevels',
    'risks',
    'invalidation',
    'toVerify',
  ],
  additionalProperties: false,
} as const

export function buildSystemPrompt(mode: ModeKey): string {
  return `${BASE_PROMPT}\n\n${MODE_PROMPTS[mode]}`
}

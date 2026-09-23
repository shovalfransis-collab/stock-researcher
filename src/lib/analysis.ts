import type { TradeType } from './riskReward'

export interface ChartRead {
  timeframe: string
  trend: 'uptrend' | 'downtrend' | 'sideways' | 'unclear'
  support: number[]
  resistance: number[]
  patterns: string[]
  indicators: string[]
}

export interface ThesisCheck {
  alignment: 'supports' | 'mixed' | 'contradicts'
  notes: string
}

export interface PlanReview {
  stopQuality: string
  targetRealism: string
  rrComment: string
}

export interface SuggestedLevels {
  entry: number
  stop: number
  target: number
}

export interface AnalysisResult {
  verdict: 'EXECUTE' | 'WAIT' | 'PASS'
  confidence: number
  summary: string
  chartRead: ChartRead
  thesisCheck: ThesisCheck
  planReview: PlanReview
  suggestedLevels: SuggestedLevels | null
  risks: string[]
  invalidation: string
  toVerify: string[]
}

export interface AnalyzeRequest {
  ticker: string
  thesis: string
  goal: number
  tradeType: TradeType
  levels?: { entry?: number; target?: number; stop?: number }
  rrResult?: string
  imageBase64: string
  mediaType: string
}

export interface AnalyzeResponse {
  result: AnalysisResult
  model: string
}

export interface AnalyzeErrorResponse {
  error: string
  detail?: string
}

const APP_PASSWORD_KEY = 'stock-researcher:app-password'

export function getStoredAppPassword(): string | null {
  try {
    return localStorage.getItem(APP_PASSWORD_KEY)
  } catch {
    return null
  }
}

export function setStoredAppPassword(password: string): void {
  try {
    localStorage.setItem(APP_PASSWORD_KEY, password)
  } catch {
    // localStorage unavailable; password just won't persist across reloads
  }
}

export async function analyzeChart(
  req: AnalyzeRequest,
): Promise<{ ok: true; data: AnalyzeResponse } | { ok: false; error: string; needsPassword: boolean }> {
  const password = getStoredAppPassword()
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(password ? { 'x-app-password': password } : {}),
    },
    body: JSON.stringify(req),
  })

  if (res.status === 401) {
    const body = (await res.json().catch(() => null)) as AnalyzeErrorResponse | null
    return { ok: false, error: body?.error ?? 'App password required.', needsPassword: true }
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as AnalyzeErrorResponse | null
    return { ok: false, error: body?.error ?? `Request failed (${res.status}).`, needsPassword: false }
  }

  const data = (await res.json()) as AnalyzeResponse
  return { ok: true, data }
}

export type Direction = 'long' | 'short'
export type TradeType = 'scalp' | 'swing' | 'long-term'
export type Verdict = 'poor' | 'marginal' | 'good' | 'excellent'

export interface RiskRewardInput {
  entry: number
  target: number
  stop: number
  tradeType: TradeType
  direction?: Direction
  accountSize?: number
  riskPercent?: number // defaults to 1
}

export interface RiskRewardResult {
  direction: Direction
  riskPerShare: number
  rewardPerShare: number
  rrRatio: number
  rrLabel: string
  targetMovePercent: number
  stopMovePercent: number
  breakEvenWinRate: number
  verdict: Verdict
  verdictLabel: string
  warnings: string[]
  position: {
    shares: number
    dollarsAtRisk: number
    potentialProfit: number
  } | null
}

export type ValidationError =
  | 'invalid-prices'
  | 'long-order'
  | 'short-order'
  | 'zero-risk'

const MIN_RR: Record<TradeType, number> = {
  scalp: 1.5,
  swing: 2,
  'long-term': 3,
}

export function detectDirection(entry: number, target: number): Direction {
  return target >= entry ? 'long' : 'short'
}

export function validateInputs(
  entry: number,
  target: number,
  stop: number,
  direction: Direction,
): ValidationError | null {
  if (
    !Number.isFinite(entry) ||
    !Number.isFinite(target) ||
    !Number.isFinite(stop) ||
    entry <= 0 ||
    target <= 0 ||
    stop <= 0
  ) {
    return 'invalid-prices'
  }
  if (direction === 'long' && !(stop < entry && entry < target)) {
    return 'long-order'
  }
  if (direction === 'short' && !(target < entry && entry < stop)) {
    return 'short-order'
  }
  return null
}

export function validationMessage(error: ValidationError): string {
  switch (error) {
    case 'invalid-prices':
      return 'Enter positive prices for entry, target, and stop.'
    case 'long-order':
      return 'For a long trade, stop must be below entry, and entry must be below target.'
    case 'short-order':
      return 'For a short trade, target must be below entry, and entry must be below stop.'
    case 'zero-risk':
      return 'Entry and stop cannot be the same price.'
  }
}

function verdictForRatio(rr: number, tradeType: TradeType): { verdict: Verdict; label: string } {
  const min = MIN_RR[tradeType]
  if (rr < 1) return { verdict: 'poor', label: 'Poor — skip it' }
  if (rr < min) return { verdict: 'marginal', label: 'Marginal — only with very high conviction' }
  if (rr < min * 1.5) return { verdict: 'good', label: 'Good — valid setup' }
  return { verdict: 'excellent', label: 'Excellent' }
}

function heuristicWarnings(
  tradeType: TradeType,
  stopMovePercent: number,
): string[] {
  const warnings: string[] = []
  if (tradeType === 'scalp' && stopMovePercent > 3) {
    warnings.push('Heuristic: wide stop for a scalp')
  }
  if (tradeType === 'swing') {
    if (stopMovePercent < 1) {
      warnings.push('Heuristic: may get stopped out by noise')
    } else if (stopMovePercent > 12) {
      warnings.push('Heuristic: very wide stop')
    }
  }
  if (tradeType === 'long-term' && stopMovePercent < 5) {
    warnings.push('Heuristic: tight stop for a long-term position')
  }
  return warnings
}

export function calculateRiskReward(input: RiskRewardInput): RiskRewardResult {
  const direction = input.direction ?? detectDirection(input.entry, input.target)
  const error = validateInputs(input.entry, input.target, input.stop, direction)
  if (error) {
    throw new Error(validationMessage(error))
  }

  const riskPerShare =
    direction === 'long' ? input.entry - input.stop : input.stop - input.entry
  const rewardPerShare =
    direction === 'long' ? input.target - input.entry : input.entry - input.target

  if (riskPerShare === 0) {
    throw new Error(validationMessage('zero-risk'))
  }

  const rrRatio = rewardPerShare / riskPerShare
  const targetMovePercent = (Math.abs(input.target - input.entry) / input.entry) * 100
  const stopMovePercent = (Math.abs(input.entry - input.stop) / input.entry) * 100
  const breakEvenWinRate = riskPerShare / (riskPerShare + rewardPerShare)

  const { verdict, label } = verdictForRatio(rrRatio, input.tradeType)
  const warnings = heuristicWarnings(input.tradeType, stopMovePercent)

  let position: RiskRewardResult['position'] = null
  if (input.accountSize && input.accountSize > 0) {
    const riskPercent = input.riskPercent ?? 1
    const dollarsBudget = input.accountSize * (riskPercent / 100)
    const shares = Math.floor(dollarsBudget / riskPerShare)
    const dollarsAtRisk = shares * riskPerShare
    const potentialProfit = shares * rewardPerShare
    position = { shares, dollarsAtRisk, potentialProfit }
  }

  return {
    direction,
    riskPerShare,
    rewardPerShare,
    rrRatio,
    rrLabel: `${rrRatio.toFixed(2)} : 1`,
    targetMovePercent,
    stopMovePercent,
    breakEvenWinRate,
    verdict,
    verdictLabel: label,
    warnings,
    position,
  }
}

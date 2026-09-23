import { describe, expect, it } from 'vitest'
import { calculateRiskReward, detectDirection, validateInputs } from './riskReward'

describe('calculateRiskReward', () => {
  it('matches the AMD swing-long spec case exactly', () => {
    const result = calculateRiskReward({
      entry: 600,
      target: 660,
      stop: 580,
      tradeType: 'swing',
      accountSize: 10000,
      riskPercent: 1,
    })

    expect(result.direction).toBe('long')
    expect(result.riskPerShare).toBeCloseTo(20)
    expect(result.stopMovePercent).toBeCloseTo(3.33, 2)
    expect(result.rewardPerShare).toBeCloseTo(60)
    expect(result.targetMovePercent).toBeCloseTo(10, 2)
    expect(result.rrRatio).toBeCloseTo(3)
    expect(result.rrLabel).toBe('3.00 : 1')
    expect(result.breakEvenWinRate).toBeCloseTo(0.25)
    expect(result.verdict).toBe('excellent')
    expect(result.position).toEqual({
      shares: 5,
      dollarsAtRisk: 100,
      potentialProfit: 300,
    })
  })

  it('detects short direction when target is below entry', () => {
    expect(detectDirection(100, 90)).toBe('short')
    expect(detectDirection(100, 110)).toBe('long')
  })

  it('calculates a valid short trade', () => {
    const result = calculateRiskReward({
      entry: 100,
      target: 85,
      stop: 106,
      tradeType: 'scalp',
    })
    expect(result.direction).toBe('short')
    expect(result.riskPerShare).toBeCloseTo(6)
    expect(result.rewardPerShare).toBeCloseTo(15)
    expect(result.rrRatio).toBeCloseTo(2.5)
    expect(result.verdict).toBe('excellent')
  })

  it('rejects invalid long ordering (stop above entry)', () => {
    expect(() =>
      calculateRiskReward({
        entry: 100,
        target: 120,
        stop: 105,
        tradeType: 'swing',
        direction: 'long',
      }),
    ).toThrow(/stop must be below entry/)
  })

  it('rejects zero or negative prices', () => {
    expect(() =>
      calculateRiskReward({
        entry: 0,
        target: 10,
        stop: 5,
        tradeType: 'swing',
      }),
    ).toThrow(/positive prices/)
  })

  it('omits position sizing when account size is missing', () => {
    const result = calculateRiskReward({
      entry: 50,
      target: 60,
      stop: 45,
      tradeType: 'long-term',
    })
    expect(result.position).toBeNull()
  })

  it('flags a wide stop on a scalp', () => {
    const result = calculateRiskReward({
      entry: 100,
      target: 105,
      stop: 95,
      tradeType: 'scalp',
    })
    expect(result.warnings).toContain('Heuristic: wide stop for a scalp')
  })

  it('flags a tight stop on a long-term trade', () => {
    const result = calculateRiskReward({
      entry: 100,
      target: 150,
      stop: 98,
      tradeType: 'long-term',
    })
    expect(result.warnings).toContain('Heuristic: tight stop for a long-term position')
  })
})

describe('validateInputs', () => {
  it('accepts a valid short ordering', () => {
    expect(validateInputs(100, 90, 105, 'short')).toBeNull()
  })

  it('rejects an invalid short ordering', () => {
    expect(validateInputs(100, 90, 95, 'short')).toBe('short-order')
  })
})

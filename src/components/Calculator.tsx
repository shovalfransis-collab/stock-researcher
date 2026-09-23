import { useMemo } from 'react'
import {
  calculateRiskReward,
  detectDirection,
  type Direction,
  type TradeType,
} from '../lib/riskReward'

const TRADE_TYPES: { value: TradeType; label: string }[] = [
  { value: 'scalp', label: 'Scalp' },
  { value: 'swing', label: 'Swing' },
  { value: 'long-term', label: 'Long-term' },
]

const verdictStyles: Record<string, string> = {
  poor: 'bg-red/10 text-red border-red/40',
  marginal: 'bg-amber/10 text-amber border-amber/40',
  good: 'bg-green/10 text-green border-green/40',
  excellent: 'bg-green-bright/10 text-green-bright border-green-bright/40',
}

function fmtMoney(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`
}

export interface CalculatorState {
  ticker: string
  entry: string
  target: string
  stop: string
  tradeType: TradeType
  direction: Direction | 'auto'
  accountSize: string
  riskPercent: string
}

interface CalculatorProps {
  state: CalculatorState
  onChange: (state: CalculatorState) => void
}

export function Calculator({ state, onChange }: CalculatorProps) {
  const set = <K extends keyof CalculatorState>(key: K, value: CalculatorState[K]) =>
    onChange({ ...state, [key]: value })

  const entry = parseFloat(state.entry)
  const target = parseFloat(state.target)
  const stop = parseFloat(state.stop)
  const accountSize = state.accountSize ? parseFloat(state.accountSize) : undefined
  const riskPercent = state.riskPercent ? parseFloat(state.riskPercent) : undefined

  const autoDirection =
    Number.isFinite(entry) && Number.isFinite(target) ? detectDirection(entry, target) : 'long'
  const direction = state.direction === 'auto' ? autoDirection : state.direction

  const { result, error } = useMemo(() => {
    if (!state.entry || !state.target || !state.stop) {
      return { result: null, error: null }
    }
    try {
      const r = calculateRiskReward({
        entry,
        target,
        stop,
        tradeType: state.tradeType,
        direction,
        accountSize,
        riskPercent,
      })
      return { result: r, error: null }
    } catch (e) {
      return { result: null, error: e instanceof Error ? e.message : 'Invalid input' }
    }
  }, [entry, target, stop, state.tradeType, direction, accountSize, riskPercent, state.entry, state.target, state.stop])

  return (
    <div className="rounded-lg border border-border bg-panel p-4 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-text">Risk / Reward Calculator</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-text-dim">
          Ticker
          <input
            className="rounded border border-border bg-bg px-3 py-2 text-text uppercase focus:border-green focus:outline-none"
            value={state.ticker}
            onChange={(e) => set('ticker', e.target.value.toUpperCase())}
            placeholder="AMD"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-dim">
          Trade type
          <select
            className="rounded border border-border bg-bg px-3 py-2 text-text focus:border-green focus:outline-none"
            value={state.tradeType}
            onChange={(e) => set('tradeType', e.target.value as TradeType)}
          >
            {TRADE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-dim">
          Entry
          <input
            className="rounded border border-border bg-bg px-3 py-2 text-text focus:border-green focus:outline-none"
            type="number"
            inputMode="decimal"
            value={state.entry}
            onChange={(e) => set('entry', e.target.value)}
            placeholder="600"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-dim">
          Direction
          <select
            className="rounded border border-border bg-bg px-3 py-2 text-text focus:border-green focus:outline-none"
            value={state.direction}
            onChange={(e) => set('direction', e.target.value as Direction | 'auto')}
          >
            <option value="auto">Auto ({autoDirection})</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-dim">
          Target
          <input
            className="rounded border border-border bg-bg px-3 py-2 text-text focus:border-green focus:outline-none"
            type="number"
            inputMode="decimal"
            value={state.target}
            onChange={(e) => set('target', e.target.value)}
            placeholder="660"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-dim">
          Stop
          <input
            className="rounded border border-border bg-bg px-3 py-2 text-text focus:border-green focus:outline-none"
            type="number"
            inputMode="decimal"
            value={state.stop}
            onChange={(e) => set('stop', e.target.value)}
            placeholder="580"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-dim">
          Account size (optional)
          <input
            className="rounded border border-border bg-bg px-3 py-2 text-text focus:border-green focus:outline-none"
            type="number"
            inputMode="decimal"
            value={state.accountSize}
            onChange={(e) => set('accountSize', e.target.value)}
            placeholder="10000"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-dim">
          % risked per trade
          <input
            className="rounded border border-border bg-bg px-3 py-2 text-text focus:border-green focus:outline-none"
            type="number"
            inputMode="decimal"
            value={state.riskPercent}
            onChange={(e) => set('riskPercent', e.target.value)}
            placeholder="1"
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-5 space-y-3">
          <div className={`rounded border px-4 py-3 text-center font-semibold ${verdictStyles[result.verdict]}`}>
            {result.verdictLabel} — R:R {result.rrLabel}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="Risk / share" value={fmtMoney(result.riskPerShare)} sub={fmtPct(result.stopMovePercent)} />
            <Stat label="Reward / share" value={fmtMoney(result.rewardPerShare)} sub={fmtPct(result.targetMovePercent)} />
            <Stat label="Break-even win rate" value={fmtPct(result.breakEvenWinRate * 100)} />
            <Stat label="Direction" value={direction === 'long' ? 'Long' : 'Short'} />
          </div>

          {result.position && (
            <div className="grid grid-cols-3 gap-3 rounded border border-border bg-bg px-4 py-3 text-sm">
              <Stat label="Position size" value={`${result.position.shares} sh`} />
              <Stat label="$ at risk" value={fmtMoney(result.position.dollarsAtRisk)} />
              <Stat label="Potential profit" value={fmtMoney(result.position.potentialProfit)} />
            </div>
          )}

          {result.warnings.length > 0 && (
            <ul className="space-y-1 text-sm text-amber">
              {result.warnings.map((w) => (
                <li key={w}>⚠ {w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-text-dim">{label}</div>
      <div className="font-mono text-text">{value}</div>
      {sub && <div className="text-xs text-text-dim">{sub}</div>}
    </div>
  )
}

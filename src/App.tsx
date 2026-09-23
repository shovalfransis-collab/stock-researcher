import { useEffect, useState } from 'react'
import { AnalystForm, type AnalystFormState } from './components/AnalystForm'
import { Calculator, type CalculatorState } from './components/Calculator'
import { History } from './components/History'
import { PasswordGate } from './components/PasswordGate'
import { ResultsPanel } from './components/ResultsPanel'
import { analyzeChart, type AnalysisResult } from './lib/analysis'
import { thumbnailFromDataUrl } from './lib/image'
import { addHistoryEntry, deleteHistoryEntry, getHistory, type HistoryEntry } from './lib/history'
import { calculateRiskReward, detectDirection } from './lib/riskReward'

const initialCalcState: CalculatorState = {
  ticker: '',
  entry: '',
  target: '',
  stop: '',
  tradeType: 'swing',
  direction: 'auto',
  accountSize: '',
  riskPercent: '1',
}

const initialAnalystState: AnalystFormState = {
  ticker: '',
  thesis: '',
  goal: '',
  tradeType: 'swing',
}

function App() {
  const [calcState, setCalcState] = useState<CalculatorState>(initialCalcState)
  const [analystState, setAnalystState] = useState<AnalystFormState>(initialAnalystState)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [result, setResult] = useState<{ result: AnalysisResult; model: string } | null>(null)
  const [pending, setPending] = useState<{ base64: string; mediaType: string; preview: string } | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  useEffect(() => {
    setHistory(getHistory())
  }, [])

  const calcVerdictLabel = (() => {
    const entry = parseFloat(calcState.entry)
    const target = parseFloat(calcState.target)
    const stop = parseFloat(calcState.stop)
    if (!Number.isFinite(entry) || !Number.isFinite(target) || !Number.isFinite(stop)) return undefined
    try {
      const direction = calcState.direction === 'auto' ? detectDirection(entry, target) : calcState.direction
      const r = calculateRiskReward({ entry, target, stop, tradeType: calcState.tradeType, direction })
      return `${r.verdictLabel} (${r.rrLabel})`
    } catch {
      return undefined
    }
  })()

  const submit = async (imageBase64: string, mediaType: string, preview: string) => {
    setSubmitting(true)
    setError(null)
    setNeedsPassword(false)

    const entry = parseFloat(calcState.entry)
    const target = parseFloat(calcState.target)
    const stop = parseFloat(calcState.stop)
    let rrResult: string | undefined
    if (Number.isFinite(entry) && Number.isFinite(target) && Number.isFinite(stop)) {
      try {
        const direction = calcState.direction === 'auto' ? detectDirection(entry, target) : calcState.direction
        const r = calculateRiskReward({ entry, target, stop, tradeType: calcState.tradeType, direction })
        rrResult = r.rrLabel
      } catch {
        rrResult = undefined
      }
    }

    const outcome = await analyzeChart({
      ticker: analystState.ticker,
      thesis: analystState.thesis,
      goal: parseFloat(analystState.goal),
      tradeType: analystState.tradeType,
      levels: Number.isFinite(entry) || Number.isFinite(target) || Number.isFinite(stop) ? { entry, target, stop } : undefined,
      rrResult,
      imageBase64,
      mediaType,
    })

    setSubmitting(false)
    if (!outcome.ok) {
      setError(outcome.error)
      if (outcome.needsPassword) {
        setNeedsPassword(true)
        setPending({ base64: imageBase64, mediaType, preview })
      }
      return
    }

    setResult({ result: outcome.data.result, model: outcome.data.model })

    try {
      const thumbnail = await thumbnailFromDataUrl(preview)
      const entryRecord = addHistoryEntry({
        ticker: analystState.ticker,
        thesis: analystState.thesis,
        goal: parseFloat(analystState.goal),
        tradeType: analystState.tradeType,
        model: outcome.data.model,
        thumbnail,
        result: outcome.data.result,
      })
      setHistory((prev) => [entryRecord, ...prev])
    } catch {
      // history is a convenience feature; failure to save shouldn't block showing the result
    }
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <header>
        <h1 className="text-xl font-bold text-text">Stock Researcher</h1>
        <p className="text-sm text-text-dim">Risk/reward math + AI chart review, for your own trades.</p>
      </header>

      <Calculator state={calcState} onChange={setCalcState} />

      <AnalystForm
        state={analystState}
        onChange={setAnalystState}
        submitting={submitting}
        onSubmit={(preview, base64, mediaType) => submit(base64, mediaType, preview)}
      />

      {needsPassword && (
        <PasswordGate
          message={error ?? 'App password required.'}
          onSubmit={() => {
            if (pending) submit(pending.base64, pending.mediaType, pending.preview)
          }}
        />
      )}

      {error && !needsPassword && (
        <p className="rounded border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">{error}</p>
      )}

      {submitting && (
        <p className="rounded border border-border bg-panel px-3 py-2 text-center text-sm text-text-dim">
          Analyzing chart… this can take 10–30 seconds.
        </p>
      )}

      {result && (
        <ResultsPanel result={result.result} model={result.model} calcVerdictLabel={calcVerdictLabel} />
      )}

      <History
        entries={history}
        onOpen={(entry) => setResult({ result: entry.result, model: entry.model })}
        onDelete={(id) => {
          deleteHistoryEntry(id)
          setHistory((prev) => prev.filter((e) => e.id !== id))
        }}
      />

      <footer className="mt-auto pt-6 text-center text-xs text-text-dim">
        Educational tool — not financial advice
      </footer>
    </div>
  )
}

export default App

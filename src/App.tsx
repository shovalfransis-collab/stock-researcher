import { useState } from 'react'
import { AnalystForm, type AnalystFormState } from './components/AnalystForm'
import { Calculator, type CalculatorState } from './components/Calculator'
import { PasswordGate } from './components/PasswordGate'
import { analyzeChart, type AnalyzeResponse } from './lib/analysis'
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
  const [response, setResponse] = useState<AnalyzeResponse | null>(null)
  const [pendingImage, setPendingImage] = useState<{ base64: string; mediaType: string } | null>(null)

  const submit = async (imageBase64: string, mediaType: string) => {
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
        setPendingImage({ base64: imageBase64, mediaType })
      }
      return
    }
    setResponse(outcome.data)
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
        onSubmit={(_preview, base64, mediaType) => submit(base64, mediaType)}
      />

      {needsPassword && (
        <PasswordGate
          message={error ?? 'App password required.'}
          onSubmit={() => {
            if (pendingImage) submit(pendingImage.base64, pendingImage.mediaType)
          }}
        />
      )}

      {error && !needsPassword && (
        <p className="rounded border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">{error}</p>
      )}

      {response && (
        <div className="rounded-lg border border-border bg-panel p-4 sm:p-6">
          <h2 className="mb-2 text-lg font-semibold text-text">
            Verdict: {response.result.verdict} ({response.result.confidence}/10)
          </h2>
          <p className="mb-2 text-xs text-text-dim">Model: {response.model}</p>
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-text-dim">
            {JSON.stringify(response.result, null, 2)}
          </pre>
        </div>
      )}

      <footer className="mt-auto pt-6 text-center text-xs text-text-dim">
        Educational tool — not financial advice
      </footer>
    </div>
  )
}

export default App

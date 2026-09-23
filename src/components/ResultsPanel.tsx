import type { AnalysisResult } from '../lib/analysis'

const verdictStyles: Record<AnalysisResult['verdict'], string> = {
  EXECUTE: 'bg-green/10 text-green border-green/40',
  WAIT: 'bg-amber/10 text-amber border-amber/40',
  PASS: 'bg-red/10 text-red border-red/40',
}

interface ResultsPanelProps {
  result: AnalysisResult
  model: string
  calcVerdictLabel?: string
}

export function ResultsPanel({ result, model, calcVerdictLabel }: ResultsPanelProps) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4 sm:p-6">
      <div className={`rounded border px-4 py-3 text-center text-lg font-bold ${verdictStyles[result.verdict]}`}>
        {result.verdict}
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-text-dim">
          <span>Confidence</span>
          <span>{result.confidence}/10</span>
        </div>
        <div className="h-2 rounded bg-bg">
          <div
            className="h-2 rounded bg-green"
            style={{ width: `${(result.confidence / 10) * 100}%` }}
          />
        </div>
      </div>

      {calcVerdictLabel && (
        <p className="mt-3 text-sm text-text-dim">
          Calculator verdict: <span className="text-text">{calcVerdictLabel}</span>
        </p>
      )}
      <p className="mt-1 text-xs text-text-dim">Model: {model}</p>

      <p className="mt-4 text-sm text-text">{result.summary}</p>

      <div className="mt-4 space-y-2">
        <Section title="Chart Read">
          <dl className="space-y-1">
            <Row label="Timeframe" value={result.chartRead.timeframe} />
            <Row label="Trend" value={result.chartRead.trend} />
            <Row label="Support" value={result.chartRead.support.join(', ') || '—'} />
            <Row label="Resistance" value={result.chartRead.resistance.join(', ') || '—'} />
            <Row label="Patterns" value={result.chartRead.patterns.join(', ') || '—'} />
            <Row label="Indicators" value={result.chartRead.indicators.join(', ') || '—'} />
          </dl>
        </Section>

        <Section title="Thesis Check">
          <p className="text-sm text-text-dim">
            Alignment: <span className="text-text">{result.thesisCheck.alignment}</span>
          </p>
          <p className="mt-1 text-sm text-text">{result.thesisCheck.notes}</p>
        </Section>

        <Section title="Plan Review">
          <dl className="space-y-1">
            <Row label="Stop quality" value={result.planReview.stopQuality} />
            <Row label="Target realism" value={result.planReview.targetRealism} />
            <Row label="R:R comment" value={result.planReview.rrComment} />
          </dl>
          {result.suggestedLevels && (
            <p className="mt-2 text-sm text-text-dim">
              Suggested levels — entry {result.suggestedLevels.entry}, stop {result.suggestedLevels.stop}, target{' '}
              {result.suggestedLevels.target}
            </p>
          )}
        </Section>

        <Section title="Risks">
          <ul className="list-inside list-disc space-y-1 text-sm text-text">
            {result.risks.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Section>

        <Section title="Invalidation">
          <p className="text-sm text-text">{result.invalidation}</p>
        </Section>

        <Section title="To Verify">
          <ul className="list-inside list-disc space-y-1 text-sm text-text">
            {result.toVerify.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="rounded border border-border bg-bg px-3 py-2" open>
      <summary className="cursor-pointer text-sm font-semibold text-text">{title}</summary>
      <div className="mt-2">{children}</div>
    </details>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-text-dim">{label}</dt>
      <dd className="text-right text-text">{value}</dd>
    </div>
  )
}

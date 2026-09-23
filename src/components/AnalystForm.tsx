import { useCallback, useRef, useState } from 'react'
import { processChartImage } from '../lib/image'
import type { TradeType } from '../lib/riskReward'

export interface AnalystFormState {
  ticker: string
  thesis: string
  goal: string
  tradeType: TradeType
}

interface AnalystFormProps {
  state: AnalystFormState
  onChange: (state: AnalystFormState) => void
  onSubmit: (imageDataUrl: string, imageBase64: string, mediaType: string) => void
  submitting: boolean
}

const TRADE_TYPES: { value: TradeType; label: string }[] = [
  { value: 'scalp', label: 'Scalp' },
  { value: 'swing', label: 'Swing' },
  { value: 'long-term', label: 'Long-term' },
]

export function AnalystForm({ state, onChange, onSubmit, submitting }: AnalystFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof AnalystFormState>(key: K, value: AnalystFormState[K]) =>
    onChange({ ...state, [key]: value })

  const handleFile = useCallback(async (file: File) => {
    setImageError(null)
    try {
      const processed = await processChartImage(file)
      setImagePreview(processed.dataUrl)
      setImageBase64(processed.base64)
      setMediaType(processed.mediaType)
    } catch (e) {
      setImageError(e instanceof Error ? e.message : 'Could not process image.')
    }
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onPaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'))
    if (item) {
      const file = item.getAsFile()
      if (file) handleFile(file)
    }
  }

  const canSubmit =
    state.ticker.trim() && state.thesis.trim() && state.goal && imageBase64 && mediaType && !submitting

  return (
    <div className="rounded-lg border border-border bg-panel p-4 sm:p-6" onPaste={onPaste}>
      <h2 className="mb-4 text-lg font-semibold text-text">AI Trade Analyst</h2>

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

        <label className="flex flex-col gap-1 text-sm text-text-dim sm:col-span-2">
          Thesis
          <textarea
            className="min-h-24 rounded border border-border bg-bg px-3 py-2 text-text focus:border-green focus:outline-none"
            value={state.thesis}
            onChange={(e) => set('thesis', e.target.value)}
            placeholder="Why do you think this trade works?"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-dim">
          Goal / target price
          <input
            className="rounded border border-border bg-bg px-3 py-2 text-text focus:border-green focus:outline-none"
            type="number"
            inputMode="decimal"
            value={state.goal}
            onChange={(e) => set('goal', e.target.value)}
            placeholder="660"
          />
        </label>
      </div>

      <div
        className={`mt-4 flex flex-col items-center justify-center gap-2 rounded border-2 border-dashed px-4 py-8 text-center text-sm ${
          dragOver ? 'border-green bg-green/5' : 'border-border'
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {imagePreview ? (
          <img src={imagePreview} alt="Chart preview" className="max-h-64 rounded border border-border" />
        ) : (
          <p className="text-text-dim">
            Drag & drop a chart screenshot, paste with Ctrl+V, or{' '}
            <button
              type="button"
              className="text-green underline"
              onClick={() => fileInputRef.current?.click()}
            >
              choose a file
            </button>
          </p>
        )}
        {imagePreview && (
          <button
            type="button"
            className="text-xs text-text-dim underline"
            onClick={() => fileInputRef.current?.click()}
          >
            Replace image
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>

      {imageError && <p className="mt-2 text-sm text-red">{imageError}</p>}

      <button
        type="button"
        disabled={!canSubmit}
        className="mt-4 w-full rounded bg-green px-4 py-2 font-semibold text-bg disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => {
          if (imagePreview && imageBase64 && mediaType) {
            onSubmit(imagePreview, imageBase64, mediaType)
          }
        }}
      >
        {submitting ? 'Analyzing… (10–30s)' : 'Analyze chart'}
      </button>
    </div>
  )
}

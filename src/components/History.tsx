import type { HistoryEntry } from '../lib/history'

interface HistoryProps {
  entries: HistoryEntry[]
  onOpen: (entry: HistoryEntry) => void
  onDelete: (id: string) => void
}

export function History({ entries, onOpen, onDelete }: HistoryProps) {
  if (entries.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-panel p-4 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-text">History</h2>
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center gap-3 rounded border border-border bg-bg px-3 py-2"
          >
            <img src={entry.thumbnail} alt="" className="h-10 w-16 rounded object-cover" />
            <button
              type="button"
              className="flex-1 text-left"
              onClick={() => onOpen(entry)}
            >
              <div className="text-sm font-semibold text-text">
                {entry.ticker} · {entry.result.verdict}
              </div>
              <div className="text-xs text-text-dim">
                {entry.tradeType} · {new Date(entry.date).toLocaleString()}
              </div>
            </button>
            <button
              type="button"
              className="text-xs text-red underline"
              onClick={() => onDelete(entry.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

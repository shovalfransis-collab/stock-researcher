import type { AnalysisResult } from './analysis'

export interface HistoryEntry {
  id: string
  date: string
  ticker: string
  thesis: string
  goal: number
  tradeType: string
  model: string
  thumbnail: string
  result: AnalysisResult
}

const STORAGE_KEY = 'stock-researcher:history'
const MAX_ENTRIES = 50

function readAll(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : []
  } catch {
    return []
  }
}

function writeAll(entries: HistoryEntry[]): void {
  let current = entries
  while (current.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
      return
    } catch {
      // Quota exceeded: drop the oldest entry and retry rather than crash.
      current = current.slice(0, -1)
    }
  }
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // nothing more we can do
  }
}

export function getHistory(): HistoryEntry[] {
  return readAll()
}

export function addHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'date'>): HistoryEntry {
  const full: HistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
  }
  const existing = readAll()
  const trimmed = [full, ...existing].slice(0, MAX_ENTRIES)
  writeAll(trimmed)
  return full
}

export function deleteHistoryEntry(id: string): void {
  writeAll(readAll().filter((e) => e.id !== id))
}

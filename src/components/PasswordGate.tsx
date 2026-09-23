import { useState } from 'react'
import { setStoredAppPassword } from '../lib/analysis'

interface PasswordGateProps {
  message: string
  onSubmit: () => void
}

export function PasswordGate({ message, onSubmit }: PasswordGateProps) {
  const [password, setPassword] = useState('')

  return (
    <div className="rounded border border-amber/40 bg-amber/10 p-4">
      <p className="mb-2 text-sm text-amber">{message}</p>
      <div className="flex gap-2">
        <input
          type="password"
          className="flex-1 rounded border border-border bg-bg px-3 py-2 text-text focus:border-green focus:outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="App password"
        />
        <button
          type="button"
          className="rounded bg-green px-4 py-2 font-semibold text-bg disabled:opacity-40"
          disabled={!password}
          onClick={() => {
            setStoredAppPassword(password)
            onSubmit()
          }}
        >
          Save & retry
        </button>
      </div>
    </div>
  )
}

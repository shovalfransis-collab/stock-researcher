import type { VercelRequest, VercelResponse } from '@vercel/node'
import { buildSystemPrompt, RESULT_JSON_SCHEMA, type ModeKey } from './_prompts.js'

export const config = {
  maxDuration: 60,
}

const MAX_IMAGE_BASE64_BYTES = 4 * 1024 * 1024 // stay well under Vercel's 4.5MB request body limit

interface OpenRouterChatResponse {
  choices?: { message?: { content?: string } }[]
}

interface Levels {
  entry?: number
  target?: number
  stop?: number
}

interface AnalyzeRequestBody {
  ticker: string
  thesis: string
  goal: number
  tradeType: ModeKey
  levels?: Levels
  rrResult?: string
  imageBase64: string
  mediaType: string
}

function isModeKey(value: unknown): value is ModeKey {
  return value === 'scalp' || value === 'swing' || value === 'long-term'
}

function validateBody(body: unknown): { ok: true; data: AnalyzeRequestBody } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Request body must be an object.' }
  }
  const b = body as Record<string, unknown>

  if (typeof b.ticker !== 'string' || !b.ticker.trim()) {
    return { ok: false, error: 'Ticker is required.' }
  }
  if (typeof b.thesis !== 'string' || !b.thesis.trim()) {
    return { ok: false, error: 'Thesis is required.' }
  }
  if (typeof b.goal !== 'number' || !Number.isFinite(b.goal) || b.goal <= 0) {
    return { ok: false, error: 'Goal price must be a positive number.' }
  }
  if (!isModeKey(b.tradeType)) {
    return { ok: false, error: 'Trade type must be scalp, swing, or long-term.' }
  }
  if (typeof b.imageBase64 !== 'string' || !b.imageBase64) {
    return { ok: false, error: 'Chart image is required.' }
  }
  if (b.imageBase64.length > MAX_IMAGE_BASE64_BYTES) {
    return { ok: false, error: 'Chart image is too large. Please use a smaller screenshot.' }
  }
  if (typeof b.mediaType !== 'string' || !b.mediaType.startsWith('image/')) {
    return { ok: false, error: 'mediaType must be an image MIME type.' }
  }

  return {
    ok: true,
    data: {
      ticker: b.ticker,
      thesis: b.thesis,
      goal: b.goal,
      tradeType: b.tradeType,
      levels: (b.levels as Levels) ?? undefined,
      rrResult: typeof b.rrResult === 'string' ? b.rrResult : undefined,
      imageBase64: b.imageBase64,
      mediaType: b.mediaType,
    },
  }
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fenced ? fenced[1] : trimmed
}

function buildUserContent(data: AnalyzeRequestBody) {
  const levelsText = data.levels
    ? `Entry: ${data.levels.entry ?? 'n/a'}, Stop: ${data.levels.stop ?? 'n/a'}, Target: ${data.levels.target ?? 'n/a'}`
    : 'Not provided'

  const text = [
    `Ticker: ${data.ticker}`,
    `Trade type: ${data.tradeType}`,
    `Goal price: ${data.goal}`,
    `Levels: ${levelsText}`,
    data.rrResult ? `Computed risk/reward: ${data.rrResult}` : null,
    `Thesis: ${data.thesis}`,
  ]
    .filter(Boolean)
    .join('\n')

  return [
    { type: 'text', text },
    { type: 'image_url', image_url: { url: `data:${data.mediaType};base64,${data.imageBase64}` } },
  ]
}

async function callOpenRouter(systemPrompt: string, data: AnalyzeRequestBody, apiKey: string, model: string) {
  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://stock-researcher.local',
      'X-Title': 'Stock Researcher',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildUserContent(data) },
      ],
      response_format: { type: 'json_object' },
    }),
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' })
    return
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  const model = process.env.OPENROUTER_MODEL
  if (!apiKey || !model) {
    res.status(500).json({
      error: 'Server is missing OPENROUTER_API_KEY or OPENROUTER_MODEL. Set them in your environment.',
    })
    return
  }

  const appPassword = process.env.APP_PASSWORD
  if (appPassword && req.headers['x-app-password'] !== appPassword) {
    res.status(401).json({ error: 'Invalid or missing app password.' })
    return
  }

  const validated = validateBody(req.body)
  if (!validated.ok) {
    res.status(400).json({ error: validated.error })
    return
  }
  const data = validated.data
  const systemPrompt = buildSystemPrompt(data.tradeType) + `\n\nRespond with JSON only, matching this schema: ${JSON.stringify(RESULT_JSON_SCHEMA)}`

  let response: Response
  try {
    response = await callOpenRouter(systemPrompt, data, apiKey, model)
  } catch {
    res.status(502).json({ error: 'Could not reach OpenRouter. Check your network and try again.' })
    return
  }

  if (!response.ok) {
    const status = response.status
    const messages: Record<number, string> = {
      401: 'OpenRouter rejected the API key. Check OPENROUTER_API_KEY.',
      402: 'Out of OpenRouter credits. Add credits at openrouter.ai and try again.',
      404: 'Model not found. Check OPENROUTER_MODEL supports chat completions.',
      429: 'Rate limited by OpenRouter. Wait a moment and try again.',
    }
    const body = await response.text().catch(() => '')
    res.status(status >= 400 && status < 600 ? status : 502).json({
      error: messages[status] ?? `OpenRouter returned an error (${status}).`,
      detail: body.slice(0, 500),
    })
    return
  }

  const payload = (await response.json()) as OpenRouterChatResponse
  const rawContent: string | undefined = payload?.choices?.[0]?.message?.content
  if (!rawContent) {
    res.status(502).json({ error: 'OpenRouter returned no content. The model may not support image input.' })
    return
  }

  const tryParse = (text: string) => {
    try {
      return JSON.parse(stripCodeFences(text))
    } catch {
      return null
    }
  }

  let parsed = tryParse(rawContent)

  // One retry: ask the model to fix its own malformed JSON rather than failing outright.
  if (!parsed) {
    try {
      const retryResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://stock-researcher.local',
          'X-Title': 'Stock Researcher',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You output only valid JSON. No prose, no code fences.' },
            { role: 'user', content: `Fix this into valid JSON only, keeping the same structure and values:\n\n${rawContent}` },
          ],
          response_format: { type: 'json_object' },
        }),
      })
      const retryPayload = (await retryResponse.json()) as OpenRouterChatResponse
      const retryContent: string | undefined = retryPayload?.choices?.[0]?.message?.content
      parsed = retryContent ? tryParse(retryContent) : null
    } catch {
      parsed = null
    }
  }

  if (!parsed) {
    res.status(502).json({ error: 'The model did not return valid JSON. Try again.' })
    return
  }

  res.status(200).json({ result: parsed, model })
}

export type ApiFormat = 'openai' | 'anthropic'

export interface ApiResult {
  ok: boolean
  content: string
  raw: string
  inputTokens: number
  outputTokens: number
  error?: string
}

export const API_KEY_STORAGE: Record<ApiFormat, string> = {
  openai:    'api_key_openai',
  anthropic: 'api_key_anthropic',
}

export function loadApiKey(format: ApiFormat): string {
  try { return localStorage.getItem(API_KEY_STORAGE[format]) ?? '' } catch { return '' }
}

export function saveApiKey(format: ApiFormat, key: string): void {
  try { localStorage.setItem(API_KEY_STORAGE[format], key) } catch {}
}

export async function submitRequest(
  format: ApiFormat,
  body: Record<string, unknown>,
  apiKey: string,
): Promise<ApiResult> {
  const url = format === 'openai'
    ? 'https://api.openai.com/v1/chat/completions'
    : 'https://api.anthropic.com/v1/messages'

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (format === 'openai') {
    headers['Authorization'] = `Bearer ${apiKey}`
  } else {
    headers['x-api-key'] = apiKey
    headers['anthropic-version'] = '2023-06-01'
    headers['anthropic-dangerous-allow-browser'] = 'true'
  }

  let raw = ''
  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
    raw = await res.text()

    if (!res.ok) {
      let msg = `HTTP ${res.status}`
      try { msg = JSON.parse(raw)?.error?.message ?? msg } catch {}
      return { ok: false, content: '', raw, inputTokens: 0, outputTokens: 0, error: msg }
    }

    const data = JSON.parse(raw) as Record<string, unknown>
    const usage = (data.usage ?? {}) as Record<string, number>

    let content = ''
    if (format === 'openai') {
      const choices = data.choices as Array<Record<string, unknown>> | undefined
      content = String((choices?.[0]?.message as Record<string, unknown> | undefined)?.content ?? '')
    } else {
      const blocks = (data.content ?? []) as Array<Record<string, unknown>>
      content = blocks.filter(b => b.type === 'text').map(b => String(b.text ?? '')).join('')
    }

    return {
      ok: true,
      content,
      raw,
      inputTokens:  usage.prompt_tokens  ?? usage.input_tokens  ?? 0,
      outputTokens: usage.completion_tokens ?? usage.output_tokens ?? 0,
    }
  } catch (e) {
    return { ok: false, content: '', raw, inputTokens: 0, outputTokens: 0, error: (e as Error).message }
  }
}

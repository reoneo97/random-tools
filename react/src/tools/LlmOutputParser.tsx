import { useState } from 'react'
import Panel from '../components/Panel'
import Button from '../components/Button'
import StatusBar from '../components/StatusBar'
import ResizablePanels from '../components/ResizablePanels'
import { renderMarkdown } from '../lib/markdown'
import { normalizeQuotes } from '../lib/normalizeQuotes'
import styles from './LlmOutputParser.module.css'

// ── Types ─────────────────────────────────────────────────────────────

interface Message {
  role: string
  content: string
  reasoning: string | null
  finish_reason: string | null
}

interface StatRow { label: string; value: string; cls?: string }
interface StatGroup { title: string; rows: StatRow[]; showBar?: boolean; outputTokens?: number; totalTokens?: number }

// ── Format detection ──────────────────────────────────────────────────

function detectFormat(data: Record<string, unknown>): 'openai' | 'anthropic' | 'unknown' {
  if (data.object === 'chat.completion' || data.choices) return 'openai'
  if (data.type === 'message' || Array.isArray(data.content)) return 'anthropic'
  return 'unknown'
}

// ── Message extraction ────────────────────────────────────────────────

function extractMessages(data: Record<string, unknown>, fmt: string): Message[] {
  if (fmt === 'openai') {
    return ((data.choices as unknown[]) ?? []).map((c: unknown) => {
      const choice = c as Record<string, unknown>
      const msg    = (choice.message ?? {}) as Record<string, unknown>
      let reasoning: string | null = msg.reasoning_content ? String(msg.reasoning_content) : null
      let content = String(msg.content ?? '')
      if (!reasoning) {
        content = content.replace(/<think>([\s\S]*?)<\/think>\s*/i, (_, r) => {
          reasoning = r.trim()
          return ''
        })
        content = content.trim()
      }
      return {
        role:         String(msg.role ?? 'assistant'),
        content,
        reasoning,
        finish_reason: choice.finish_reason ? String(choice.finish_reason) : null,
      }
    })
  }
  if (fmt === 'anthropic') {
    const blocks = Array.isArray(data.content) ? (data.content as unknown[]) : []
    let reasoning: string | null = null
    let content = ''
    for (const b of blocks) {
      const block = b as Record<string, unknown>
      if (block.type === 'thinking') reasoning = (reasoning ?? '') + String(block.thinking ?? '')
      else if (block.type === 'text') content  += String(block.text ?? '')
    }
    if (!content && typeof data.content === 'string') content = data.content
    return [{ role: String(data.role ?? 'assistant'), content, reasoning, finish_reason: data.stop_reason ? String(data.stop_reason) : null }]
  }
  return []
}

// ── Stats builder ─────────────────────────────────────────────────────

function buildStats(data: Record<string, unknown>, fmt: string, messages: Message[]): StatGroup[] {
  const usage = (data.usage ?? {}) as Record<string, number>
  const groups: StatGroup[] = []

  const info: StatRow[] = []
  if (data.model)   info.push({ label: 'Model',   value: String(data.model), cls: 'highlight' })
  if (data.id)      info.push({ label: 'ID',      value: String(data.id).slice(0, 28) + '…' })
  if (data.created) info.push({ label: 'Created', value: new Date(Number(data.created) * 1000).toLocaleString() })
  if (fmt !== 'unknown') info.push({ label: 'Format', value: fmt === 'openai' ? 'OpenAI' : 'Anthropic', cls: 'purple' })
  if (info.length) groups.push({ title: 'Response Info', rows: info })

  const tokenRows: StatRow[] = []
  if (usage.prompt_tokens     != null) tokenRows.push({ label: 'Prompt tokens',     value: usage.prompt_tokens.toLocaleString() })
  if (usage.completion_tokens != null) tokenRows.push({ label: 'Completion tokens', value: usage.completion_tokens.toLocaleString(), cls: 'highlight' })
  if (usage.total_tokens      != null) tokenRows.push({ label: 'Total tokens',      value: usage.total_tokens.toLocaleString(), cls: 'good' })
  const cd = ((usage as unknown) as Record<string, Record<string, number>>).completion_tokens_details ?? {}
  if (cd.reasoning_tokens != null) tokenRows.push({ label: 'Reasoning tokens', value: cd.reasoning_tokens.toLocaleString(), cls: 'purple' })
  if (usage.input_tokens  != null) tokenRows.push({ label: 'Input tokens',     value: usage.input_tokens.toLocaleString() })
  if (usage.output_tokens != null) tokenRows.push({ label: 'Output tokens',    value: usage.output_tokens.toLocaleString(), cls: 'highlight' })
  if (usage.cache_read_input_tokens     != null) tokenRows.push({ label: 'Cache read',  value: usage.cache_read_input_tokens.toLocaleString(),     cls: 'good' })
  if (usage.cache_creation_input_tokens != null) tokenRows.push({ label: 'Cache write', value: usage.cache_creation_input_tokens.toLocaleString() })

  const totalOut = usage.completion_tokens ?? usage.output_tokens ?? 0
  const totalIn  = usage.prompt_tokens     ?? usage.input_tokens  ?? 0
  if (tokenRows.length) groups.push({ title: 'Token Usage', rows: tokenRows, showBar: true, outputTokens: totalOut, totalTokens: totalIn + totalOut })

  const msgRows: StatRow[] = []
  messages.forEach((m, i) => {
    msgRows.push({ label: `[${i}] chars`, value: m.content.length.toLocaleString() })
    msgRows.push({ label: `[${i}] words`, value: m.content.trim().split(/\s+/).filter(Boolean).length.toLocaleString() })
    if (m.reasoning) msgRows.push({ label: `[${i}] reasoning chars`, value: m.reasoning.length.toLocaleString(), cls: 'purple' })
    if (m.finish_reason) msgRows.push({ label: `[${i}] finish`, value: m.finish_reason, cls: m.finish_reason === 'stop' || m.finish_reason === 'end_turn' ? 'good' : 'warn' })
  })
  if (msgRows.length) groups.push({ title: 'Message Stats', rows: msgRows })

  return groups
}

// ── Samples ───────────────────────────────────────────────────────────

const SAMPLE_OAI = JSON.stringify({
  id: 'chatcmpl-ABC123', object: 'chat.completion', created: 1741478400, model: 'gpt-4o-2024-08-06',
  choices: [{ index: 0, message: { role: 'assistant', reasoning_content: 'The user wants merge sort explained. I should cover concept, complexity, and a Python example.',
    content: '# Merge Sort\n\nMerge sort is a **divide-and-conquer** algorithm with $O(n \\log n)$ complexity.\n\n## Steps\n\n1. Split the array in half\n2. Recursively sort each half\n3. Merge the sorted halves\n\n```python\ndef merge_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    mid = len(arr) // 2\n    return merge(merge_sort(arr[:mid]), merge_sort(arr[mid:]))\n```\n\n> Merge sort is **stable** and great for external sorting.\n\n## Complexity\n\nThe recurrence relation is:\n\n$$T(n) = 2T\\left(\\frac{n}{2}\\right) + O(n)$$\n\nBy the Master Theorem with $a = 2$, $b = 2$, $f(n) = n$, we get $T(n) = O(n \\log n)$.\n\nSpace complexity: $O(n)$ for the auxiliary array.'
  }, finish_reason: 'stop' }],
  usage: { prompt_tokens: 18, completion_tokens: 212, total_tokens: 230, completion_tokens_details: { reasoning_tokens: 47 } }
}, null, 2)

const SAMPLE_ANT = JSON.stringify({
  id: 'msg_01Sample', type: 'message', role: 'assistant', model: 'claude-opus-4-6',
  content: [
    { type: 'thinking', thinking: 'User wants quicksort. I should explain pivot selection, partitioning, and add a JS example.' },
    { type: 'text', text: '## Quicksort\n\nQuicksort uses a **pivot** element to partition arrays recursively.\n\n```javascript\nfunction quicksort(arr, lo = 0, hi = arr.length - 1) {\n  if (lo < hi) {\n    const p = partition(arr, lo, hi);\n    quicksort(arr, lo, p - 1);\n    quicksort(arr, p + 1, hi);\n  }\n  return arr;\n}\n```\n\n## Complexity Analysis\n\nFor a random pivot, the expected number of comparisons satisfies:\n\n$$E[C_n] = 2(n+1)H_n - 4n$$\n\nwhere $H_n = \\sum_{k=1}^{n} \\frac{1}{k}$ is the $n$-th harmonic number, giving $E[C_n] = O(n \\log n)$.\n\n| Case | Time | Space |\n|------|------|-------|\n| Average | $O(n \\log n)$ | $O(\\log n)$ |\n| Worst | $O(n^2)$ | $O(n)$ |' }
  ],
  stop_reason: 'end_turn',
  usage: { input_tokens: 22, output_tokens: 267, cache_read_input_tokens: 1024, cache_creation_input_tokens: 0 }
}, null, 2)

// ── Nested JSON unwrapping ────────────────────────────────────────────
// Some APIs wrap the LLM response as a JSON string inside another object
// e.g. { result: { content: [{ result: "{\"choices\":[...]}" }] } }
// Recursively search for a string value that is itself valid JSON matching
// a known LLM format, and return that inner object.

function unwrapNestedLlmResponse(val: unknown): Record<string, unknown> | null {
  if (typeof val === 'string') {
    try {
      const inner = JSON.parse(val)
      if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
        if (detectFormat(inner as Record<string, unknown>) !== 'unknown')
          return inner as Record<string, unknown>
      }
    } catch {}
    return null
  }
  if (Array.isArray(val)) {
    for (const item of val) {
      const found = unwrapNestedLlmResponse(item)
      if (found) return found
    }
    return null
  }
  if (val && typeof val === 'object') {
    for (const v of Object.values(val as Record<string, unknown>)) {
      const found = unwrapNestedLlmResponse(v)
      if (found) return found
    }
    return null
  }
  return null
}

// ── Component ─────────────────────────────────────────────────────────

export default function LlmOutputParser() {
  const [input, setInput]     = useState('')
  const [messages, setMsgs]   = useState<Message[]>([])
  const [stats, setStats]     = useState<StatGroup[]>([])
  const [status, setStatus]   = useState<{ msg: string; kind: 'ok' | 'err' | 'muted' }>({ msg: '', kind: 'muted' })
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())

  const parse = (raw = input) => {
    const trimmed = raw.trim()
    if (!trimmed) { setStatus({ msg: 'No input.', kind: 'muted' }); return }
    let data: Record<string, unknown>
    try { data = JSON.parse(normalizeQuotes(trimmed)) }
    catch (e) { setStatus({ msg: `✖ ${(e as Error).message}`, kind: 'err' }); return }

    let fmt = detectFormat(data)
    if (fmt === 'unknown') {
      const inner = unwrapNestedLlmResponse(data)
      if (inner) { data = inner; fmt = detectFormat(data) }
    }
    const msgs = extractMessages(data, fmt)
    setMsgs(msgs)
    setStats(buildStats(data, fmt, msgs))
    setCollapsed(new Set())
    const hasReasoning = msgs.some(m => m.reasoning)
    setStatus({ msg: `✔ Parsed · ${msgs.length} message${msgs.length !== 1 ? 's' : ''}${hasReasoning ? ' · reasoning detected' : ''}`, kind: 'ok' })
  }

  const loadSample = (s: string) => { setInput(s); parse(s) }

  const toggleCollapse = (i: number) =>
    setCollapsed(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next })

  return (
    <div className={styles.root}>
      <ResizablePanels defaultSplit={35}>
        {/* Input */}
        <Panel title="Raw JSON" actions={
          <>
            <Button onClick={() => loadSample(SAMPLE_OAI)}>OpenAI sample</Button>
            <Button onClick={() => loadSample(SAMPLE_ANT)}>Anthropic sample</Button>
          </>
        }>
          <div className={styles.toolbar}>
            <Button variant="primary" onClick={() => parse()}>Parse ↵</Button>
            <Button variant="danger" onClick={() => { setInput(''); setMsgs([]); setStats([]); setStatus({ msg: '', kind: 'muted' }) }}>Clear</Button>
          </div>
          <textarea
            className={styles.textarea}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); parse() } }}
            placeholder="Paste a chat/completions API response (OpenAI or Anthropic)…"
            spellCheck={false}
          />
        </Panel>

        <ResizablePanels defaultSplit={65}>
        {/* Rendered output */}
        <Panel title="Rendered Output" actions={
          <Button onClick={() => navigator.clipboard.writeText(messages.map(m => m.content).join('\n\n'))}>Copy text</Button>
        }>
          <div className={styles.rendered}>
            {messages.length === 0 ? (
              <span className={styles.placeholder}>Parsed output will appear here…</span>
            ) : messages.map((m, i) => (
              <div key={i}>
                <span className={`${styles.rolePill} ${styles[`role_${m.role}`] ?? styles.role_assistant}`}>{m.role}</span>
                {m.reasoning && (
                  <div className={styles.reasoningBlock}>
                    <div className={styles.reasoningHeader} onClick={() => toggleCollapse(i)}>
                      <span>🧠 Reasoning / Thinking</span>
                      <span>{collapsed.has(i) ? '▼' : '▲'}</span>
                    </div>
                    {!collapsed.has(i) && <pre className={styles.reasoningBody}>{m.reasoning}</pre>}
                  </div>
                )}
                <div
                  className={styles.mdContent}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                />
                {i < messages.length - 1 && <hr className={styles.divider} />}
              </div>
            ))}
          </div>
        </Panel>

        {/* Stats */}
        <Panel title="Metadata & Stats">
          <div className={styles.statsBody}>
            {stats.length === 0 ? (
              <span className={styles.placeholder}>Parse a response to see stats.</span>
            ) : stats.map(g => (
              <div key={g.title} className={styles.statGroup}>
                <h3 className={styles.statGroupTitle}>{g.title}</h3>
                {g.rows.map(r => (
                  <div key={r.label} className={styles.statRow}>
                    <span className={styles.statLabel}>{r.label}</span>
                    <span className={`${styles.statValue} ${r.cls ? styles[r.cls] : ''}`}>{r.value}</span>
                  </div>
                ))}
                {g.showBar && g.totalTokens && g.totalTokens > 0 && (
                  <>
                    <div className={styles.tokenBar}>
                      <div className={styles.tokenBarFill} style={{ width: `${Math.round(((g.outputTokens ?? 0) / g.totalTokens) * 100)}%` }} />
                    </div>
                    <div className={styles.tokenBarLabel}>{Math.round(((g.outputTokens ?? 0) / g.totalTokens) * 100)}% output</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </Panel>
        </ResizablePanels>
      </ResizablePanels>
      <StatusBar message={status.msg} kind={status.kind} />
    </div>
  )
}

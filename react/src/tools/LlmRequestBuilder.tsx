import { useState, useRef } from 'react'
import Panel from '../components/Panel'
import Button from '../components/Button'
import StatusBar from '../components/StatusBar'
import ResizablePanels from '../components/ResizablePanels'
import styles from './LlmRequestBuilder.module.css'

type Format = 'openai' | 'anthropic'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const DEFAULT_MODEL: Record<Format, string> = {
  openai:    'gpt-4o',
  anthropic: 'claude-opus-4-6',
}

function buildOpenAI(messages: Message[], system: string, model: string, maxTokens: number, temperature: number) {
  const msgs: unknown[] = []
  if (system.trim()) msgs.push({ role: 'system', content: system.trim() })
  msgs.push(...messages.map(m => ({ role: m.role, content: m.content })))
  return { model, messages: msgs, max_tokens: maxTokens, temperature }
}

function buildAnthropic(messages: Message[], system: string, model: string, maxTokens: number, temperature: number) {
  const body: Record<string, unknown> = {
    model,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    max_tokens: maxTokens,
    temperature,
  }
  if (system.trim()) body.system = system.trim()
  return body
}

let idCounter = 0
const uid = () => `msg-${++idCounter}`

export default function LlmRequestBuilder() {
  const [format, setFormat]           = useState<Format>('openai')
  const [model, setModel]             = useState(DEFAULT_MODEL.openai)
  const [system, setSystem]           = useState('')
  const [messages, setMessages]       = useState<Message[]>([{ id: uid(), role: 'user', content: '' }])
  const [maxTokens, setMaxTokens]     = useState(1024)
  const [temperature, setTemperature] = useState(0.7)
  const [copied, setCopied]           = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const switchFormat = (f: Format) => { setFormat(f); setModel(DEFAULT_MODEL[f]) }

  const addMessage = (role: 'user' | 'assistant') =>
    setMessages(prev => [...prev, { id: uid(), role, content: '' }])

  const removeMessage = (id: string) =>
    setMessages(prev => prev.filter(m => m.id !== id))

  const updateContent = (id: string, content: string) =>
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content } : m))

  const toggleRole = (id: string) =>
    setMessages(prev => prev.map(m =>
      m.id === id ? { ...m, role: m.role === 'user' ? 'assistant' : 'user' } : m
    ))

  const outputJson = JSON.stringify(
    format === 'openai'
      ? buildOpenAI(messages, system, model, maxTokens, temperature)
      : buildAnthropic(messages, system, model, maxTokens, temperature),
    null, 2
  )

  const copy = async () => {
    await navigator.clipboard.writeText(outputJson)
    setCopied(true)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 1500)
  }

  const clear = () => {
    setSystem('')
    setMessages([{ id: uid(), role: 'user', content: '' }])
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <div className={styles.fmtGroup}>
          <button className={`${styles.fmtBtn} ${format === 'openai' ? styles.fmtActive : ''}`} onClick={() => switchFormat('openai')}>OpenAI</button>
          <button className={`${styles.fmtBtn} ${format === 'anthropic' ? styles.fmtActive : ''}`} onClick={() => switchFormat('anthropic')}>Anthropic</button>
        </div>
        <div className={styles.sep} />
        <span className={styles.label}>Model</span>
        <input
          className={styles.modelInput}
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder="model name"
          spellCheck={false}
        />
        <div className={styles.sep} />
        <span className={styles.label}>Max tokens</span>
        <input
          className={styles.numInput}
          type="number"
          value={maxTokens}
          onChange={e => setMaxTokens(Number(e.target.value))}
          min={1}
          max={65536}
        />
        <span className={styles.label}>Temp</span>
        <input
          className={styles.numInput}
          type="number"
          value={temperature}
          onChange={e => setTemperature(Number(e.target.value))}
          min={0}
          max={2}
          step={0.1}
        />
        <div className={styles.sep} />
        <Button variant="danger" onClick={clear}>Clear</Button>
      </div>

      <ResizablePanels defaultSplit={55}>
        {/* Left: builder */}
        <Panel title="Request Builder">
          <div className={styles.builderCol}>
            <label className={styles.fieldLabel}>
              System prompt <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              className={styles.textarea}
              rows={3}
              value={system}
              onChange={e => setSystem(e.target.value)}
              placeholder="You are a helpful assistant…"
              spellCheck={false}
            />

            <div className={styles.msgsHeader}>
              <span className={styles.fieldLabel}>Messages</span>
              <div className={styles.addBtns}>
                <Button onClick={() => addMessage('user')}>+ User</Button>
                <Button onClick={() => addMessage('assistant')}>+ Assistant</Button>
              </div>
            </div>

            {messages.map((m, idx) => (
              <div key={m.id} className={styles.msgCard}>
                <div className={styles.msgBar}>
                  <button
                    className={`${styles.rolePill} ${m.role === 'user' ? styles.roleUser : styles.roleAsst}`}
                    onClick={() => toggleRole(m.id)}
                    title="Click to switch role"
                  >
                    {m.role}
                  </button>
                  <span className={styles.msgIdx}>#{idx + 1}</span>
                  <button
                    className={styles.delBtn}
                    onClick={() => removeMessage(m.id)}
                    title="Remove message"
                  >×</button>
                </div>
                <textarea
                  className={styles.msgTextarea}
                  value={m.content}
                  onChange={e => updateContent(m.id, e.target.value)}
                  placeholder={m.role === 'user' ? 'User message…' : 'Assistant response…'}
                  spellCheck={false}
                  rows={3}
                />
              </div>
            ))}
          </div>
        </Panel>

        {/* Right: JSON output */}
        <Panel
          title={`${format === 'openai' ? 'OpenAI' : 'Anthropic'} Request JSON`}
          actions={<Button onClick={copy}>{copied ? 'Copied!' : 'Copy'}</Button>}
        >
          <pre className={styles.outputPre}>{outputJson}</pre>
        </Panel>
      </ResizablePanels>
      <StatusBar message="" kind="muted" />
    </div>
  )
}

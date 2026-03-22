import { useState, useCallback, useRef } from 'react'
import Panel from '../components/Panel'
import Button from '../components/Button'
import StatusBar from '../components/StatusBar'
import styles from './JsonFormatter.module.css'

type StatusKind = 'ok' | 'err' | 'info' | 'muted'

function highlight(json: string): string {
  return json
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(
      /("(\\u[\da-fA-F]{4}|\\[^u]|[^"\\])*")(\s*:)?|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)|true|false|null|[{}\[\],]/g,
      match => {
        if (/^"/.test(match))
          return match.endsWith(':')
            ? `<span class="tok-key">${match.slice(0, -1)}</span>:`
            : `<span class="tok-str">${match}</span>`
        if (/true|false/.test(match)) return `<span class="tok-bool">${match}</span>`
        if (/null/.test(match))       return `<span class="tok-null">${match}</span>`
        if (/[{}\[\],]/.test(match))  return `<span class="tok-punct">${match}</span>`
        return `<span class="tok-num">${match}</span>`
      }
    )
}

const SAMPLE = JSON.stringify({
  name: 'json-formatter',
  version: '1.0.0',
  nested: { active: true, score: 9.8, tags: ['tool', 'json'] },
  notes: null,
}, null, 2)

export default function JsonFormatter() {
  const [input, setInput]           = useState('')
  const [output, setOutput]         = useState('')
  const [highlighted, setHighlight] = useState('')
  const [status, setStatus]         = useState<{ msg: string; kind: StatusKind }>({ msg: '', kind: 'muted' })
  const [outStatus, setOutStatus]   = useState('')
  const [sortKeys, setSortKeys]     = useState(false)
  const [indent, setIndent]         = useState<number | string>(4)
  const copyBtnRef = useRef<HTMLButtonElement>(null)

  const deepSort = (val: unknown): unknown => {
    if (Array.isArray(val)) return val.map(deepSort)
    if (val && typeof val === 'object') {
      return Object.fromEntries(
        Object.keys(val as object).sort().map(k => [k, deepSort((val as Record<string, unknown>)[k])])
      )
    }
    return val
  }

  const format = useCallback((compact = false) => {
    const raw = input.trim()
    if (!raw) { setStatus({ msg: 'No input.', kind: 'muted' }); return }

    let parsed: unknown
    try { parsed = JSON.parse(raw) }
    catch (e) {
      setStatus({ msg: `✖ ${(e as Error).message}`, kind: 'err' })
      setOutput(''); setHighlight(''); setOutStatus('')
      return
    }

    const data = sortKeys ? deepSort(parsed) : parsed
    const indentVal = compact ? undefined : (indent === 'tab' ? '\t' : Number(indent))
    const result = JSON.stringify(data, null, indentVal)

    setOutput(result)
    setHighlight(highlight(result))
    setStatus({ msg: '✔ Valid JSON', kind: 'ok' })

    const bytes = new TextEncoder().encode(result).length
    const keys  = (result.match(/"[^"]+"\s*:/g) ?? []).length
    setOutStatus(`${bytes.toLocaleString()} bytes · ${keys.toLocaleString()} keys`)
  }, [input, sortKeys, indent])

  const copy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    if (copyBtnRef.current) {
      copyBtnRef.current.textContent = 'Copied!'
      setTimeout(() => { if (copyBtnRef.current) copyBtnRef.current.textContent = 'Copy' }, 1500)
    }
  }

  return (
    <div className={styles.root}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <label className={styles.label}>Indent</label>
        <select
          className={styles.select}
          value={String(indent)}
          onChange={e => setIndent(e.target.value === 'tab' ? 'tab' : Number(e.target.value))}
        >
          <option value="2">2 spaces</option>
          <option value="4">4 spaces</option>
          <option value="tab">Tab</option>
        </select>
        <div className={styles.sep} />
        <Button
          onClick={() => setSortKeys(s => !s)}
          style={sortKeys ? { color: 'var(--blue)' } : undefined}
        >
          {sortKeys ? '✔ Sort keys' : 'Sort keys'}
        </Button>
        <Button onClick={() => format(true)}>Compact</Button>
        <div className={styles.sep} />
        <Button variant="primary" onClick={() => format()}>Format ↵</Button>
        <Button variant="danger" onClick={() => { setInput(''); setOutput(''); setHighlight(''); setStatus({ msg: '', kind: 'muted' }); setOutStatus('') }}>
          Clear
        </Button>
      </div>

      <div className={styles.panels}>
        {/* Input */}
        <Panel
          title="Input"
          actions={
            <>
              <Button onClick={async () => { const t = await navigator.clipboard.readText().catch(() => ''); if (t) setInput(t) }}>Paste</Button>
              <Button onClick={() => { setInput(SAMPLE); }}>Sample</Button>
            </>
          }
        >
          <textarea
            className={styles.textarea}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); format() } }}
            placeholder="Paste JSON here and click Format, or press Ctrl+Enter…"
            spellCheck={false}
          />
          <StatusBar message={status.msg} kind={status.kind} />
        </Panel>

        {/* Output */}
        <Panel title="Output" actions={<Button ref={copyBtnRef} onClick={copy}>Copy</Button>}>
          <div
            className={styles.output}
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
          <StatusBar message={outStatus} kind="info" />
        </Panel>
      </div>
    </div>
  )
}

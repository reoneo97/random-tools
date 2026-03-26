import { useState, useCallback, useRef } from 'react'
import Panel from '../components/Panel'
import Button from '../components/Button'
import StatusBar from '../components/StatusBar'
import ResizablePanels from '../components/ResizablePanels'
import JsonTree, { collectPaths } from './JsonTree'
import styles from './JsonFormatter.module.css'
import { normalizeQuotes } from '../lib/normalizeQuotes'

const SAMPLE = JSON.stringify({
  name: 'json-formatter',
  version: '1.0.0',
  nested: { active: true, score: 9.8, tags: ['tool', 'json'] },
  notes: null,
}, null, 2)

export default function JsonFormatter() {
  const [input, setInput]       = useState('')
  const [output, setOutput]     = useState('')        // raw string for copy
  const [parsed, setParsed]     = useState<unknown>(null) // for tree
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [status, setStatus]     = useState<{ msg: string; kind: 'ok' | 'err' | 'info' | 'muted' }>({ msg: '', kind: 'muted' })
  const [outStatus, setOutStatus] = useState('')
  const [sortKeys, setSortKeys] = useState(false)
  const [indent, setIndent]     = useState<number | string>(4)
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

    let data: unknown
    try { data = JSON.parse(normalizeQuotes(raw)) }
    catch (e) {
      setStatus({ msg: `✖ ${(e as Error).message}`, kind: 'err' })
      setOutput(''); setParsed(null); setCollapsed(new Set()); setOutStatus('')
      return
    }

    if (sortKeys) data = deepSort(data)

    const indentVal = compact ? undefined : (indent === 'tab' ? '\t' : Number(indent))
    const result = JSON.stringify(data, null, indentVal)

    setOutput(result)
    setParsed(data)
    setCollapsed(new Set()) // expand all on (re)format

    const bytes = new TextEncoder().encode(result).length
    const keys  = (result.match(/"[^"]+"\s*:/g) ?? []).length
    setStatus({ msg: '✔ Valid JSON', kind: 'ok' })
    setOutStatus(`${bytes.toLocaleString()} bytes · ${keys.toLocaleString()} keys`)
  }, [input, sortKeys, indent])

  const toggle = useCallback((path: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(path) ? next.delete(path) : next.add(path)
      return next
    })
  }, [])

  const collapseAll = () => parsed !== null && setCollapsed(collectPaths(parsed))
  const expandAll   = () => setCollapsed(new Set())

  const copy = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    if (copyBtnRef.current) {
      copyBtnRef.current.textContent = 'Copied!'
      setTimeout(() => { if (copyBtnRef.current) copyBtnRef.current.textContent = 'Copy' }, 1500)
    }
  }

  const clear = () => {
    setInput(''); setOutput(''); setParsed(null)
    setCollapsed(new Set())
    setStatus({ msg: '', kind: 'muted' }); setOutStatus('')
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
        <Button variant="danger" onClick={clear}>Clear</Button>
      </div>

      <ResizablePanels>
        {/* Input */}
        <Panel
          title="Input"
          actions={
            <>
              <Button onClick={async () => { const t = await navigator.clipboard.readText().catch(() => ''); if (t) setInput(t) }}>Paste</Button>
              <Button onClick={() => setInput(SAMPLE)}>Sample</Button>
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
        </Panel>

        {/* Output — interactive tree */}
        <Panel
          title="Output"
          actions={
            <>
              {parsed !== null && (
                <>
                  <Button onClick={collapseAll}>Collapse all</Button>
                  <Button onClick={expandAll}>Expand all</Button>
                </>
              )}
              <Button ref={copyBtnRef} onClick={copy}>Copy</Button>
            </>
          }
        >
          {parsed !== null ? (
            <JsonTree value={parsed} collapsed={collapsed} onToggle={toggle} />
          ) : (
            <div className={styles.emptyOutput}>
              <span>Formatted output will appear here.</span>
            </div>
          )}
        </Panel>
      </ResizablePanels>
      <StatusBar message={status.msg + (outStatus ? ` · ${outStatus}` : '')} kind={status.kind} />
    </div>
  )
}

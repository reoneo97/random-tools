import { useState, useMemo } from 'react'
import Panel from '../components/Panel'
import Button from '../components/Button'
import { diffWords, diffLines, type DiffOp } from '../lib/diff'
import styles from './PromptDiff.module.css'

type Mode = 'words' | 'lines'

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderWordDiff(ops: DiffOp[]): string {
  return ops.map(op => {
    const v = esc(op.value)
    if (op.type === 'insert') return `<mark class="ins">${v}</mark>`
    if (op.type === 'delete') return `<mark class="del">${v}</mark>`
    return v
  }).join('')
}

function renderLineDiff(ops: DiffOp[]): string {
  return ops.map(op => {
    const v = esc(op.value)
    if (op.type === 'insert') return `<div class="line-ins">+ ${v}</div>`
    if (op.type === 'delete') return `<div class="line-del">- ${v}</div>`
    return `<div class="line-eq">  ${v}</div>`
  }).join('')
}

function Stats({ ops }: { ops: DiffOp[] }) {
  const added   = ops.filter(o => o.type === 'insert').reduce((s, o) => s + o.value.length, 0)
  const removed = ops.filter(o => o.type === 'delete').reduce((s, o) => s + o.value.length, 0)
  const same    = ops.filter(o => o.type === 'equal').reduce((s, o) => s + o.value.length, 0)
  const total   = added + removed + same || 1
  const changed = Math.round(((added + removed) / total) * 100)

  return (
    <div className={styles.stats}>
      <span className={styles.statIns}>+{added} chars</span>
      <span className={styles.statDel}>−{removed} chars</span>
      <span className={styles.statPct}>{changed}% changed</span>
    </div>
  )
}

const SAMPLE_A = `You are a helpful assistant.
Answer the user's question clearly and concisely.
If you don't know the answer, say so.`

const SAMPLE_B = `You are a highly knowledgeable assistant.
Answer the user's question clearly, concisely, and accurately.
Always cite your sources when possible.
If you are uncertain, acknowledge it explicitly.`

export default function PromptDiff() {
  const [a, setA]       = useState('')
  const [b, setB]       = useState('')
  const [mode, setMode] = useState<Mode>('words')
  const [diffed, setDiffed] = useState(false)

  const ops = useMemo<DiffOp[]>(() => {
    if (!diffed) return []
    return mode === 'words' ? diffWords(a, b) : diffLines(a, b)
  }, [diffed, a, b, mode])

  const run = () => setDiffed(true)
  const reset = () => { setA(''); setB(''); setDiffed(false) }
  const loadSample = () => { setA(SAMPLE_A); setB(SAMPLE_B); setDiffed(true) }

  const html = useMemo(() => {
    if (!diffed || !ops.length) return ''
    return mode === 'words' ? renderWordDiff(ops) : renderLineDiff(ops)
  }, [diffed, ops, mode])

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <span className={styles.label}>Mode</span>
        <div className={styles.modeGroup}>
          <button className={`${styles.modeBtn} ${mode === 'words' ? styles.modeActive : ''}`} onClick={() => { setMode('words'); setDiffed(false) }}>Word</button>
          <button className={`${styles.modeBtn} ${mode === 'lines' ? styles.modeActive : ''}`} onClick={() => { setMode('lines'); setDiffed(false) }}>Line</button>
        </div>
        <div className={styles.sep} />
        <Button variant="primary" onClick={run}>Diff ↵</Button>
        <Button onClick={loadSample}>Sample</Button>
        <Button variant="danger" onClick={reset}>Clear</Button>
      </div>

      <div className={styles.inputs}>
        <Panel title="Prompt A (original)" titleColor="#60a5fa">
          <textarea className={styles.textarea} value={a} onChange={e => { setA(e.target.value); setDiffed(false) }}
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run() } }}
            placeholder="Paste original prompt…" spellCheck={false} />
        </Panel>
        <Panel title="Prompt B (revised)" titleColor="#f472b6">
          <textarea className={styles.textarea} value={b} onChange={e => { setB(e.target.value); setDiffed(false) }}
            onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run() } }}
            placeholder="Paste revised prompt…" spellCheck={false} />
        </Panel>
      </div>

      <Panel title="Diff Output">
        {diffed && ops.length > 0 && <Stats ops={ops} />}
        <div className={styles.diffOut}>
          {!diffed ? (
            <span className={styles.placeholder}>Diff will appear here. Press <kbd>Ctrl+Enter</kbd> or click Diff.</span>
          ) : ops.length === 0 ? (
            <span className={styles.same}>Prompts are identical.</span>
          ) : (
            <div
              className={`${styles.diffContent} ${mode === 'lines' ? styles.lineMode : ''}`}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      </Panel>
    </div>
  )
}

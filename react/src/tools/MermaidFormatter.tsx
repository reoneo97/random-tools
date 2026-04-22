import { useState, useCallback, useRef, useEffect } from 'react'
import mermaid from 'mermaid'
import Panel from '../components/Panel'
import Button from '../components/Button'
import StatusBar from '../components/StatusBar'
import ResizablePanels from '../components/ResizablePanels'
import styles from './MermaidFormatter.module.css'

// ── Samples ───────────────────────────────────────────────────────────

const SAMPLES: Record<string, string> = {
  Flowchart: `flowchart TD
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Great!]
    B -- No  --> D[Debug]
    D --> B`,

  Sequence: `sequenceDiagram
    participant Client
    participant Server
    participant DB
    Client->>Server: POST /api/data
    Server->>DB: INSERT ...
    DB-->>Server: OK
    Server-->>Client: 201 Created`,

  'Class Diagram': `classDiagram
    class Animal {
      +String name
      +int age
      +makeSound() void
    }
    class Dog {
      +fetch() void
    }
    Animal <|-- Dog`,

  'State Diagram': `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : start
    Processing --> Done : success
    Processing --> Error : failure
    Error --> Idle : retry
    Done --> [*]`,
}

// ── Node colour helpers ───────────────────────────────────────────────

const PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f8fafc', '#94a3b8', '#475569', '#0f172a',
]

function extractNodeId(svgId: string): string | null {
  const m = svgId.match(/^(?:flowchart|graph)-(.+)-\d+$/)
  return m ? m[1] : null
}

function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#000000' : '#ffffff'
}

function applyStyleToSource(source: string, nodeId: string, color: string | null): string {
  const esc = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const stripped = source.replace(
    new RegExp(`\\n[ \\t]*style[ \\t]+${esc}(?:[ \\t]+[^\\n]*)?`, 'g'),
    '',
  )
  if (color === null) return stripped
  return stripped.trimEnd() + `\nstyle ${nodeId} fill:${color},color:${contrastColor(color)}`
}

function patchNodeSvg(svgEl: SVGSVGElement, nodeId: string, color: string | null) {
  for (const nodeEl of svgEl.querySelectorAll('g.node')) {
    if (extractNodeId(nodeEl.id) !== nodeId) continue
    const shape = nodeEl.querySelector('rect, polygon, circle, ellipse')
    if (!shape) break
    if (color) {
      shape.setAttribute('fill', color)
      const fg = contrastColor(color)
      nodeEl.querySelectorAll('text').forEach(t => t.setAttribute('fill', fg))
      nodeEl.querySelectorAll('span, p, div').forEach(t => { (t as HTMLElement).style.color = fg })
    } else {
      shape.removeAttribute('fill')
      nodeEl.querySelectorAll('text').forEach(t => t.removeAttribute('fill'))
      nodeEl.querySelectorAll('span, p, div').forEach(t => { (t as HTMLElement).style.color = '' })
    }
    break
  }
}

// ── Component ─────────────────────────────────────────────────────────

let idCounter = 0

mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })

interface ColorPicker { nodeId: string; x: number; y: number }

export default function MermaidFormatter() {
  const [input, setInput]             = useState(SAMPLES.Flowchart)
  const [theme, setTheme]             = useState<'dark' | 'default' | 'neutral' | 'forest'>('default')
  const [status, setStatus]           = useState<{ msg: string; kind: 'ok' | 'err' | 'muted' }>({ msg: 'Paste Mermaid syntax and click Render.', kind: 'muted' })
  const [isFlowchart, setIsFlowchart] = useState(false)
  const [colorPicker, setColorPicker] = useState<ColorPicker | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)
  const prevTheme = useRef(theme)

  // AI generate state
  const [genPrompt,   setGenPrompt]   = useState('')
  const [genEndpoint, setGenEndpoint] = useState('https://openrouter.ai/api/v1/chat/completions')
  const [genModel,    setGenModel]    = useState('google/gemini-2.0-flash-lite')
  const [genApiKey,   setGenApiKey]   = useState('')
  const [genLoading,  setGenLoading]  = useState(false)

  const render = useCallback(async (code: string, t: typeof theme) => {
    setColorPicker(null)
    if (!code.trim()) {
      setStatus({ msg: 'No input.', kind: 'muted' })
      if (outputRef.current) outputRef.current.innerHTML = ''
      setIsFlowchart(false)
      return
    }
    try {
      mermaid.initialize({ startOnLoad: false, theme: t, securityLevel: 'loose' })
      const id = `mermaid-svg-${++idCounter}`
      const { svg } = await mermaid.render(id, code)
      if (outputRef.current) {
        outputRef.current.innerHTML = svg
        const svgEl = outputRef.current.querySelector('svg')
        if (svgEl) {
          svgEl.removeAttribute('width')
          svgEl.removeAttribute('height')
          svgEl.style.width = '100%'
          svgEl.style.height = 'auto'
        }
      }
      setIsFlowchart(/^(flowchart|graph)\b/i.test(code.trim()))
      setStatus({ msg: '✔ Rendered successfully', kind: 'ok' })
    } catch (e) {
      if (outputRef.current) outputRef.current.innerHTML = ''
      setIsFlowchart(false)
      setStatus({ msg: `✖ ${(e as Error).message.split('\n')[0]}`, kind: 'err' })
    }
  }, [])

  useEffect(() => {
    if (theme !== prevTheme.current && input.trim()) {
      prevTheme.current = theme
      render(input, theme)
    }
  }, [theme, input, render])

  const handleRender = () => render(input, theme)

  // ── Node recolouring ──────────────────────────────────────────────

  const handleSvgClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isFlowchart) return
    let el = e.target as Element | null
    while (el && el !== e.currentTarget) {
      if (el.classList.contains('node')) {
        const nodeId = extractNodeId(el.id)
        if (nodeId) {
          const r = el.getBoundingClientRect()
          setColorPicker({ nodeId, x: r.left + r.width / 2, y: r.bottom + 8 })
          return
        }
      }
      el = el.parentElement
    }
    setColorPicker(null)
  }, [isFlowchart])

  // Patch SVG immediately; update source for persistence across re-renders
  const setNodeColor = useCallback((nodeId: string, color: string | null) => {
    const svgEl = outputRef.current?.querySelector('svg')
    if (svgEl) patchNodeSvg(svgEl, nodeId, color)
    setInput(prev => applyStyleToSource(prev, nodeId, color))
  }, [])

  const applyNodeColor = useCallback((nodeId: string, color: string | null) => {
    setNodeColor(nodeId, color)
    setColorPicker(null)
  }, [setNodeColor])

  useEffect(() => {
    if (!colorPicker) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setColorPicker(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [colorPicker])

  // ── PNG export ────────────────────────────────────────────────────

  const buildPngBlob = useCallback((): Promise<Blob | null> => {
    return new Promise(resolve => {
      const svgEl = outputRef.current?.querySelector('svg')
      if (!svgEl) return resolve(null)

      const clone = svgEl.cloneNode(true) as SVGSVGElement
      clone.style.background = 'none'
      clone.style.backgroundColor = 'transparent'
      clone.querySelectorAll('[class*="background"], rect.background').forEach(el => el.remove())
      const firstRect = clone.querySelector(':scope > g > rect:first-child, :scope > rect:first-child')
      if (firstRect) {
        const r = firstRect as SVGRectElement
        if (r.getAttribute('width') === '100%' || r.getAttribute('height') === '100%') r.remove()
      }

      const vb = svgEl.viewBox.baseVal
      const w = vb.width > 0 ? vb.width : svgEl.clientWidth
      const h = vb.height > 0 ? vb.height : svgEl.clientHeight
      const SCALE = 2

      const svgStr = new XMLSerializer().serializeToString(clone)
      const blob   = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
      const url    = URL.createObjectURL(blob)

      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width  = Math.ceil(w * SCALE)
        canvas.height = Math.ceil(h * SCALE)
        const ctx = canvas.getContext('2d')!
        ctx.scale(SCALE, SCALE)
        ctx.drawImage(img, 0, 0, w, h)
        URL.revokeObjectURL(url)
        canvas.toBlob(pngBlob => resolve(pngBlob), 'image/png')
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
      img.src = url
    })
  }, [])

  const copyAsPng = useCallback(async () => {
    const pngBlob = await buildPngBlob()
    if (!pngBlob) { setStatus({ msg: '✖ PNG export failed', kind: 'err' }); return }
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])
      setStatus({ msg: '✔ PNG copied to clipboard', kind: 'ok' })
    } catch {
      setStatus({ msg: '✖ Clipboard blocked — use Download instead', kind: 'err' })
    }
  }, [buildPngBlob])

  const downloadAsPng = useCallback(async () => {
    const pngBlob = await buildPngBlob()
    if (!pngBlob) { setStatus({ msg: '✖ PNG export failed', kind: 'err' }); return }
    const url = URL.createObjectURL(pngBlob)
    const a   = document.createElement('a')
    a.href    = url
    a.download = 'diagram.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    setStatus({ msg: '✔ PNG downloaded', kind: 'ok' })
  }, [buildPngBlob])

  // ── Editor handlers ───────────────────────────────────────────────

  const handleClear = () => {
    setInput('')
    setColorPicker(null)
    setIsFlowchart(false)
    if (outputRef.current) outputRef.current.innerHTML = ''
    setStatus({ msg: 'Paste Mermaid syntax and click Render.', kind: 'muted' })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta  = e.currentTarget
    const val = ta.value
    const s   = ta.selectionStart
    const end = ta.selectionEnd

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleRender()
      return
    }

    // Ctrl+C with no selection → copy entire current line (VSCode-style)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && s === end) {
      e.preventDefault()
      const lineStart = val.lastIndexOf('\n', s - 1) + 1
      const lineEnd   = val.indexOf('\n', s)
      const line      = lineEnd === -1 ? val.slice(lineStart) : val.slice(lineStart, lineEnd + 1)
      navigator.clipboard.writeText(line)
      return
    }

    // Tab → insert 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault()
      setInput(val.substring(0, s) + '  ' + val.substring(end))
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2 })
    }
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <Button variant="primary" onClick={handleRender}>Render ↵</Button>
        <Button variant="danger" onClick={handleClear}>Clear</Button>

        <div className={styles.sep} />

        <span className={styles.label}>Theme</span>
        <select
          className={styles.select}
          value={theme}
          onChange={e => setTheme(e.target.value as typeof theme)}
        >
          <option value="dark">Dark</option>
          <option value="default">Default</option>
          <option value="neutral">Neutral</option>
          <option value="forest">Forest</option>
        </select>

        <div className={styles.sep} />

        <span className={styles.label}>Sample</span>
        {Object.keys(SAMPLES).map(name => (
          <Button key={name} onClick={() => setInput(SAMPLES[name])}>{name}</Button>
        ))}

        {isFlowchart && (
          <>
            <div className={styles.sep} />
            <span className={styles.hint}>Click nodes to recolour</span>
          </>
        )}
      </div>

      <ResizablePanels>
        <Panel title="Mermaid Source">
          <div className={styles.genSection}>
            <textarea
              className={styles.genPrompt}
              rows={2}
              value={genPrompt}
              onChange={e => setGenPrompt(e.target.value)}
              placeholder="Describe your diagram in plain English…"
              spellCheck={false}
            />
            <div className={styles.genRow}>
              <input
                className={styles.genInput}
                value={genEndpoint}
                onChange={e => setGenEndpoint(e.target.value)}
                placeholder="API endpoint"
                spellCheck={false}
              />
              <input
                className={`${styles.genInput} ${styles.genModel}`}
                value={genModel}
                onChange={e => setGenModel(e.target.value)}
                placeholder="Model name"
                spellCheck={false}
              />
            </div>
            <div className={styles.genRow}>
              <input
                className={styles.genInput}
                type="password"
                value={genApiKey}
                onChange={e => setGenApiKey(e.target.value)}
                placeholder="API key"
                spellCheck={false}
              />
              <Button variant="primary" onClick={() => {}} disabled={genLoading || !genPrompt.trim()}>
                {genLoading ? 'Generating…' : 'Generate ✦'}
              </Button>
            </div>
          </div>
          <div className={styles.sourceDivider} />
          <textarea
            className={styles.textarea}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter Mermaid diagram syntax…"
            spellCheck={false}
          />
        </Panel>

        <Panel title="Preview" actions={
          <>
            <Button onClick={copyAsPng}>Copy PNG</Button>
            <Button onClick={downloadAsPng}>Download PNG</Button>
          </>
        }>
          <div className={styles.preview}>
            <div
              ref={outputRef}
              className={`${styles.svgWrap} ${isFlowchart ? styles.interactive : ''}`}
              onClick={handleSvgClick}
            />
          </div>
        </Panel>
      </ResizablePanels>
      <StatusBar message={status.msg} kind={status.kind} />

      {colorPicker && (
        <>
          <div className={styles.cpOverlay} onClick={() => setColorPicker(null)} />
          <div
            className={styles.colorPicker}
            style={{ left: colorPicker.x, top: colorPicker.y }}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.cpHeader}>
              Node: <code className={styles.cpNodeId}>{colorPicker.nodeId}</code>
            </div>
            <div className={styles.cpPalette}>
              {PALETTE.map(c => (
                <button
                  key={c}
                  className={styles.cpSwatch}
                  style={{ background: c }}
                  onClick={() => applyNodeColor(colorPicker.nodeId, c)}
                  title={c}
                />
              ))}
            </div>
            <div className={styles.cpRow}>
              <label className={styles.cpCustomLabel}>
                Custom
                <input
                  type="color"
                  className={styles.cpCustom}
                  onChange={e => setNodeColor(colorPicker.nodeId, e.target.value)}
                />
              </label>
              <button className={styles.cpReset} onClick={() => applyNodeColor(colorPicker.nodeId, null)}>
                Reset
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

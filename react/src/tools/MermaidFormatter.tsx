import { useState, useCallback, useRef, useEffect } from 'react'
import mermaid from 'mermaid'
import Panel from '../components/Panel'
import Button from '../components/Button'
import StatusBar from '../components/StatusBar'
import ResizablePanels from '../components/ResizablePanels'
import styles from './MermaidFormatter.module.css'

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

let idCounter = 0

mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })

export default function MermaidFormatter() {
  const [input, setInput]   = useState(SAMPLES.Flowchart)
  const [theme, setTheme]   = useState<'dark' | 'default' | 'neutral' | 'forest'>('default')
  const [status, setStatus] = useState<{ msg: string; kind: 'ok' | 'err' | 'muted' }>({ msg: 'Paste Mermaid syntax and click Render.', kind: 'muted' })
  const outputRef = useRef<HTMLDivElement>(null)
  const prevTheme = useRef(theme)

  const render = useCallback(async (code: string, t: typeof theme) => {
    if (!code.trim()) {
      setStatus({ msg: 'No input.', kind: 'muted' })
      if (outputRef.current) outputRef.current.innerHTML = ''
      return
    }
    try {
      mermaid.initialize({ startOnLoad: false, theme: t, securityLevel: 'loose' })
      const id  = `mermaid-svg-${++idCounter}`
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
      setStatus({ msg: '✔ Rendered successfully', kind: 'ok' })
    } catch (e) {
      if (outputRef.current) outputRef.current.innerHTML = ''
      setStatus({ msg: `✖ ${(e as Error).message.split('\n')[0]}`, kind: 'err' })
    }
  }, [])

  // Auto-render when theme changes if there's content
  useEffect(() => {
    if (theme !== prevTheme.current && input.trim()) {
      prevTheme.current = theme
      render(input, theme)
    }
  }, [theme, input, render])

  const handleRender = () => render(input, theme)

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
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)

      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = Math.ceil(w * SCALE)
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
    const a = document.createElement('a')
    a.href = URL.createObjectURL(pngBlob)
    a.download = 'diagram.png'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
    setStatus({ msg: '✔ PNG downloaded', kind: 'ok' })
  }, [buildPngBlob])

  const handleClear = () => {
    setInput('')
    if (outputRef.current) outputRef.current.innerHTML = ''
    setStatus({ msg: 'Paste Mermaid syntax and click Render.', kind: 'muted' })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleRender()
    }
    // Tab → insert 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta  = e.currentTarget
      const s   = ta.selectionStart
      const end = ta.selectionEnd
      const val = ta.value
      setInput(val.substring(0, s) + '  ' + val.substring(end))
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2 })
    }
  }

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
      </div>

      <ResizablePanels>
        <Panel title="Mermaid Source">
          <textarea
            className={styles.textarea}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter Mermaid diagram syntax…"
            spellCheck={false}
          />
        </Panel>

        <Panel title="Preview" actions={<><Button onClick={copyAsPng}>Copy PNG</Button><Button onClick={downloadAsPng}>Download PNG</Button></>}>
          <div className={styles.preview}>
            {/* output injected here as SVG */}
            <div ref={outputRef} className={styles.svgWrap} />
          </div>
        </Panel>
      </ResizablePanels>
      <StatusBar message={status.msg} kind={status.kind} />
    </div>
  )
}

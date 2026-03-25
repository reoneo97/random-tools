import { useState, useCallback, useRef, useEffect } from 'react'
import mermaid from 'mermaid'
import Panel from '../components/Panel'
import Button from '../components/Button'
import StatusBar from '../components/StatusBar'
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

mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' })

export default function MermaidFormatter() {
  const [input, setInput]   = useState(SAMPLES.Flowchart)
  const [theme, setTheme]   = useState<'dark' | 'default' | 'neutral' | 'forest'>('dark')
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
      if (outputRef.current) outputRef.current.innerHTML = svg
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

      <div className={styles.panels}>
        <Panel title="Mermaid Source">
          <textarea
            className={styles.textarea}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter Mermaid diagram syntax…"
            spellCheck={false}
          />
          <StatusBar message={status.msg} kind={status.kind} />
        </Panel>

        <Panel title="Preview">
          <div className={styles.preview}>
            {/* output injected here as SVG */}
            <div ref={outputRef} className={styles.svgWrap} />
          </div>
        </Panel>
      </div>
    </div>
  )
}

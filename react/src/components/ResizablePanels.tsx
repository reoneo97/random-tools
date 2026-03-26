import { useState, useRef, useCallback } from 'react'
import styles from './ResizablePanels.module.css'

interface Props {
  children: [React.ReactNode, React.ReactNode]
  defaultSplit?: number   // left pane % of total, default 50
  minPct?: number         // minimum % for each pane, default 15
}

export default function ResizablePanels({ children, defaultSplit = 50, minPct = 15 }: Props) {
  const [split, setSplit] = useState(defaultSplit)
  const containerRef = useRef<HTMLDivElement>(null)

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMove = (ev: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((ev.clientX - rect.left) / rect.width) * 100
      setSplit(Math.min(100 - minPct, Math.max(minPct, pct)))
    }

    const handleUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }, [minPct])

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.pane} style={{ width: `${split}%` }}>
        {children[0]}
      </div>
      <div className={styles.handle} onMouseDown={startDrag}>
        <div className={styles.handleBar} />
      </div>
      <div className={styles.pane} style={{ width: `${100 - split}%` }}>
        {children[1]}
      </div>
    </div>
  )
}

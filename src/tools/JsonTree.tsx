import type { CSSProperties } from 'react'
import styles from './JsonTree.module.css'

type JVal = null | boolean | number | string | JVal[] | { [k: string]: JVal }

interface NodeProps {
  value: JVal
  path: string
  keyLabel?: string
  isLast: boolean
  depth: number
  collapsed: Set<string>
  onToggle: (path: string) => void
}

function primitiveStr(val: JVal): string {
  return typeof val === 'string' ? `"${val}"` : String(val)
}

function primitiveClass(val: JVal): string {
  if (typeof val === 'string')  return styles.str
  if (typeof val === 'number')  return styles.num
  if (typeof val === 'boolean') return styles.bool
  return styles.nul
}

function JsonNode({ value, path, keyLabel, isLast, depth, collapsed, onToggle }: NodeProps) {
  const isObj = value !== null && typeof value === 'object' && !Array.isArray(value)
  const isArr = Array.isArray(value)
  const collapsible = isObj || isArr
  const isCollapsed = collapsed.has(path)

  const keyEl = keyLabel !== undefined
    ? <><span className={styles.key}>"{keyLabel}"</span><span className={styles.punct}>: </span></>
    : null

  const comma = !isLast ? <span className={styles.punct}>,</span> : null
  const indent = { '--depth': depth } as CSSProperties

  if (!collapsible) {
    return (
      <div className={styles.line} style={indent}>
        <span className={styles.gap} />
        {keyEl}
        <span className={primitiveClass(value)}>{primitiveStr(value)}</span>
        {comma}
      </div>
    )
  }

  const entries: Array<{ k: string; v: JVal }> = isArr
    ? (value as JVal[]).map((v, i) => ({ k: String(i), v }))
    : Object.entries(value as { [k: string]: JVal }).map(([k, v]) => ({ k, v }))

  const open = isArr ? '[' : '{'
  const close = isArr ? ']' : '}'
  const count = entries.length
  const summary = isArr
    ? `${count} item${count !== 1 ? 's' : ''}`
    : `${count} key${count !== 1 ? 's' : ''}`

  return (
    <div>
      <div className={styles.line} style={indent}>
        <button
          className={styles.toggle}
          onClick={() => onToggle(path)}
          aria-label={isCollapsed ? 'expand' : 'collapse'}
        >
          {isCollapsed ? '▶' : '▼'}
        </button>
        {keyEl}
        <span className={styles.punct}>{open}</span>
        {isCollapsed && (
          <>
            <span className={styles.summary}> {summary} </span>
            <span className={styles.punct}>{close}</span>
            {comma}
          </>
        )}
      </div>

      {!isCollapsed && (
        <>
          {entries.map(({ k, v }, i) => (
            <JsonNode
              key={k}
              value={v}
              path={`${path}.${k}`}
              keyLabel={isArr ? undefined : k}
              isLast={i === entries.length - 1}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
            />
          ))}
          <div className={styles.line} style={indent}>
            <span className={styles.gap} />
            <span className={styles.punct}>{close}</span>
            {comma}
          </div>
        </>
      )}
    </div>
  )
}

interface JsonTreeProps {
  value: unknown
  collapsed: Set<string>
  onToggle: (path: string) => void
}

export default function JsonTree({ value, collapsed, onToggle }: JsonTreeProps) {
  return (
    <div className={styles.tree}>
      <JsonNode
        value={value as JVal}
        path="root"
        isLast
        depth={0}
        collapsed={collapsed}
        onToggle={onToggle}
      />
    </div>
  )
}

// Utility: collect every path that is an object or array
export function collectPaths(val: unknown, path = 'root'): Set<string> {
  const paths = new Set<string>()
  function walk(v: unknown, p: string) {
    if (v !== null && typeof v === 'object') {
      paths.add(p)
      if (Array.isArray(v)) v.forEach((item, i) => walk(item, `${p}.${i}`))
      else Object.entries(v as object).forEach(([k, item]) => walk(item, `${p}.${k}`))
    }
  }
  walk(val, path)
  return paths
}

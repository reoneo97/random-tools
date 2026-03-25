import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import ShortcutsModal from './ShortcutsModal'
import styles from './Layout.module.css'

const tools = [
  { path: '/json-formatter',      label: 'JSON Formatter',       icon: '{ }' },
  { path: '/llm-parser',          label: 'LLM Output Parser',    icon: '⬡' },
  { path: '/llm-eval',            label: 'LLM Evaluator',        icon: '★' },
  { path: '/prompt-diff',         label: 'Prompt Diff',          icon: '±' },
  { path: '/mermaid-formatter',   label: 'Mermaid Formatter',    icon: '◈' },
  { path: '/vlm-token-calc',      label: 'VLM Token Calc',       icon: '⊞' },
  { path: '/vlm-request-builder', label: 'VLM Request Builder',  icon: '⊕' },
]

export default function Layout() {
  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return
      if (e.key === '?') setShowShortcuts(true)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className={styles.shell}>
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <span className={styles.brandName}>random-tools</span>
        </div>
        <ul className={styles.navList}>
          {tools.map(t => (
            <li key={t.path}>
              <NavLink
                to={t.path}
                className={({ isActive }) =>
                  `${styles.navItem} ${isActive ? styles.active : ''}`
                }
              >
                <span className={styles.icon}>{t.icon}</span>
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <button className={styles.shortcutsBtn} onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (?)">
          <span className={styles.shortcutsBtnIcon}>⌨</span>
          Shortcuts
          <kbd className={styles.shortcutsBtnKbd}>?</kbd>
        </button>
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  )
}

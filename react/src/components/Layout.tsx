import { NavLink, Outlet } from 'react-router-dom'
import styles from './Layout.module.css'

const tools = [
  { path: '/json-formatter',    label: 'JSON Formatter',     icon: '{ }' },
  { path: '/llm-parser',        label: 'LLM Output Parser',  icon: '⬡' },
  { path: '/llm-eval',          label: 'LLM Evaluator',      icon: '★' },
  { path: '/prompt-diff',       label: 'Prompt Diff',        icon: '±' },
  { path: '/mermaid-formatter', label: 'Mermaid Formatter',  icon: '◈' },
]

export default function Layout() {
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
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

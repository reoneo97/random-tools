import { useEffect } from 'react'
import { SHORTCUT_GROUPS } from '../lib/shortcuts'
import styles from './ShortcutsModal.module.css'

interface Props {
  onClose: () => void
}

export default function ShortcutsModal({ onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Keyboard Shortcuts</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={styles.body}>
          {SHORTCUT_GROUPS.map(group => (
            <div key={group.tool} className={styles.group}>
              <div className={styles.groupTitle}>{group.tool}</div>
              <div className={styles.rows}>
                {group.shortcuts.map((s, i) => (
                  <div key={i} className={styles.row}>
                    <span className={styles.desc}>{s.description}</span>
                    <span className={styles.keys}>
                      {s.keys.map((k, ki) => (
                        <span key={ki}>
                          <kbd className={styles.kbd}>{k}</kbd>
                          {ki < s.keys.length - 1 && <span className={styles.plus}>+</span>}
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className={styles.footer}>
          Press <kbd className={styles.kbd}>Esc</kbd> or click outside to close
        </div>
      </div>
    </div>
  )
}

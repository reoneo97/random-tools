import { ReactNode } from 'react'
import styles from './Panel.module.css'

interface Props {
  title: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  titleColor?: string
}

export default function Panel({ title, actions, children, className = '', titleColor }: Props) {
  return (
    <div className={`${styles.panel} ${className}`}>
      <div className={styles.header}>
        <span style={titleColor ? { color: titleColor } : undefined}>{title}</span>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {children}
    </div>
  )
}

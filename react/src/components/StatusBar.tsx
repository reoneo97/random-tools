import styles from './StatusBar.module.css'

type Kind = 'ok' | 'err' | 'info' | 'muted'

interface Props { message: string; kind?: Kind }

export default function StatusBar({ message, kind = 'muted' }: Props) {
  return <div className={`${styles.bar} ${styles[kind]}`}>{message}</div>
}

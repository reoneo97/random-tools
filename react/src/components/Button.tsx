import { ButtonHTMLAttributes, forwardRef } from 'react'
import styles from './Button.module.css'

type Variant = 'default' | 'primary' | 'danger'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'default', className = '', ...props }, ref) => (
    <button
      ref={ref}
      {...props}
      className={`${styles.btn} ${styles[variant]} ${className}`}
    />
  )
)
Button.displayName = 'Button'
export default Button

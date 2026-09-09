import type { ButtonHTMLAttributes } from 'react'
import './button.css'

type Variant = 'primary' | 'break' | 'ghost' | 'danger'
type Size = 'md' | 'lg'

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type="button"
      className={`ui-button ui-button--${variant} ui-button--${size} ${className}`}
      {...rest}
    />
  )
}

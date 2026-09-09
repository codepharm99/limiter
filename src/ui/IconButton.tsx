import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function IconButton({
  label,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`ui-icon-button ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

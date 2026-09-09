import type { ButtonHTMLAttributes } from 'react'

type Variant = 'plain' | 'active' | 'dashed' | 'filled'

const variants: Record<Variant, string> = {
  plain: 'border border-transparent bg-card text-text-2 hover:text-text',
  active: 'border border-accent bg-card text-text',
  dashed: 'border border-dashed border-text-2 bg-transparent text-text-2 hover:text-text',
  filled: 'border border-transparent bg-accent text-on-accent',
}

/** Small pill button used for tasks, toggles and starter-set picks. */
export function Chip({
  variant = 'plain',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`ui-chip whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition disabled:opacity-60 ${variants[variant]} ${className}`}
      {...rest}
    />
  )
}

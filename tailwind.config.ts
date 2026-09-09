import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-deep': 'var(--bg-deep)',
        card: 'var(--card)',
        text: 'var(--text)',
        'text-2': 'var(--text-2)',
        'on-accent': 'var(--on-accent)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        break: 'var(--break)',
        success: 'var(--success)',
        scrim: 'var(--scrim)',
      },
    },
  },
  plugins: [],
} satisfies Config

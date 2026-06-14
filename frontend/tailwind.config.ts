import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f1f1f6',
        surface: '#fbfbfe',
        elevated: '#e8e8f0',
        border: '#dcdce6',
        'border-strong': '#c4c4d8',
        text: '#1c1c27',
        'text-muted': '#6b6b80',
        'text-faint': '#9999ad',
        'text-placeholder': '#b6b6c8',
        accent: '#d97706',
        'accent-dim': '#b45309',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config

import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const variants = {
  primary:
    'bg-accent text-black hover:bg-accent-dim focus-visible:ring-2 focus-visible:ring-accent/40',
  ghost:
    'bg-transparent text-text border border-border hover:bg-elevated hover:border-border-strong focus-visible:ring-2 focus-visible:ring-accent/40',
  danger:
    'bg-red-600/15 text-red-700 border border-red-800/40 hover:bg-red-600/25 focus-visible:ring-2 focus-visible:ring-accent/40',
}

const sizes = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2 gap-2',
  lg: 'text-sm px-5 py-2.5 gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg transition-all
        active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed
        outline-none focus-visible:ring-offset-0
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  ),
)

Button.displayName = 'Button'

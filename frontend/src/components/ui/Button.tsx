import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const variants = {
  primary: 'bg-accent text-black hover:bg-accent-dim focus-visible:ring-2 focus-visible:ring-accent/40',
  ghost: 'bg-transparent text-[#e8e8f0] border border-border hover:bg-elevated hover:border-[#3a3a50]',
  danger: 'bg-red-600/15 text-red-400 border border-red-800/40 hover:bg-red-600/25',
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
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  ),
)

Button.displayName = 'Button'

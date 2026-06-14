import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`input-base ${error ? 'border-red-500/50' : ''} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  ),
)

Input.displayName = 'Input'

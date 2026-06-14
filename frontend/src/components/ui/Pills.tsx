interface PillOption {
  value: string
  label: string
}

interface PillsProps {
  options: PillOption[]
  value: string
  onChange: (value: string) => void
}

export function Pills({ options, value, onChange }: PillsProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`shrink-0 text-sm px-3 py-1.5 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
              active
                ? 'text-text bg-elevated'
                : 'text-text-muted hover:text-text hover:bg-elevated/60'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

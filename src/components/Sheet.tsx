import type { ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  /** Right-hand header button, e.g. Save */
  action?: { label: string; onClick: () => void; disabled?: boolean }
  children: ReactNode
}

/** Bottom sheet modal used for editors and number entry */
export default function Sheet({ title, onClose, action, children }: Props) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="animate-sheet pb-safe max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-slate-900 p-5 ring-1 ring-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center">
          <button onClick={onClose} className="justify-self-start text-slate-400">
            Cancel
          </button>
          <h2 className="font-bold">{title}</h2>
          {action ? (
            <button
              onClick={action.onClick}
              disabled={action.disabled}
              className="justify-self-end font-bold text-emerald-400 disabled:text-slate-600"
            >
              {action.label}
            </button>
          ) : (
            <span />
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">{children}</div>
}

export function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-2xl bg-slate-800/70 p-3 text-left ring-1 ring-slate-700/60"
      role="switch"
      aria-checked={checked}
    >
      <span className="flex-1">
        <span className="block font-semibold">{label}</span>
        {sub && <span className="block text-xs text-slate-400">{sub}</span>}
      </span>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-600'}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? 'left-[1.375rem]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

export function NumberField({
  value,
  onChange,
  prefix,
  suffix,
  placeholder,
  decimal,
  big,
}: {
  value: string
  onChange: (v: string) => void
  prefix?: string
  suffix?: string
  placeholder?: string
  decimal?: boolean
  big?: boolean
}) {
  return (
    <div className="flex items-center rounded-xl bg-slate-800 ring-1 ring-slate-700 focus-within:ring-emerald-400">
      {prefix && <span className="pl-3 font-bold text-slate-500">{prefix}</span>}
      <input
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,-]/g, ''))}
        className={`w-full min-w-0 bg-transparent p-3 font-bold outline-none ${big ? 'text-center text-4xl' : ''}`}
      />
      {suffix && <span className="pr-3 text-sm font-semibold text-slate-500">{suffix}</span>}
    </div>
  )
}

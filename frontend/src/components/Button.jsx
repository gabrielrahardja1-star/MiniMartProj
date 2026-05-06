const VARIANTS = {
  primary:   'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold shadow-sm',
  secondary: 'border border-gray-300 hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-medium',
  danger:    'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold shadow-sm',
  ghost:     'text-gray-500 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-lg gap-2',
  lg: 'px-5 py-3.5 text-base rounded-xl gap-2',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  children,
  className = '',
  ...rest
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-all ${VARIANTS[variant]} ${SIZES[size]} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...rest}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : Icon ? (
        <Icon size={size === 'sm' ? 14 : 16} className="shrink-0" />
      ) : null}
      {children}
    </button>
  )
}

const PADDING = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-6' }

export default function Card({ children, padding = 'md', hover = false, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${PADDING[padding]} ${hover ? 'transition-shadow hover:shadow-md' : ''} ${className}`}>
      {children}
    </div>
  )
}

import Button from './Button'

export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      {Icon && (
        <div className="bg-amber-50 rounded-2xl p-4 mb-4">
          <Icon size={36} className="text-amber-400" />
        </div>
      )}
      <p className="text-gray-700 font-medium text-base">{title}</p>
      {description && <p className="text-gray-400 text-sm mt-1">{description}</p>}
      {action && (
        <div className="mt-4">
          <Button onClick={action.onClick}>{action.label}</Button>
        </div>
      )}
    </div>
  )
}

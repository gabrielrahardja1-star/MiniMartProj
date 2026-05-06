export function SkeletonText({ width = 'w-24' }) {
  return <div className={`h-3 ${width} bg-gray-200 rounded-full animate-pulse`} />
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 bg-gray-200 rounded-full animate-pulse ${i === 0 ? 'w-3/4' : i === 1 ? 'w-1/2' : 'w-1/4'}`} />
      ))}
    </div>
  )
}

export function SkeletonRow({ cols = 4 }) {
  const widths = ['w-1/4', 'w-1/3', 'w-1/5', 'w-1/6', 'w-1/4']
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`h-3 ${widths[i % widths.length]} bg-gray-200 rounded-full animate-pulse`} />
        </td>
      ))}
    </tr>
  )
}

export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="h-4 bg-muted rounded w-1/3 mt-2"></div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-xl"></div>
        ))}
      </div>

      <div className="h-20 bg-muted rounded-xl"></div>

      <div className="space-y-4">
        <div className="h-6 bg-muted rounded w-1/5 mb-4"></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded-xl"></div>
        ))}
      </div>
    </div>
  )
}

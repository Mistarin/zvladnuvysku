import { ClipboardList, Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-primary opacity-50" />
          <h1 className="text-2xl font-bold text-foreground">Administrace</h1>
        </div>
      </div>

      {/* Tab skeleton */}
      <div className="flex gap-2 border-b border-border">
        <span className="px-4 py-2 text-sm font-semibold text-muted-foreground">
          Načítám data...
        </span>
      </div>

      {/* Loading spinner */}
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
        <p className="text-sm font-medium text-muted-foreground">Stahuji data ze Supabase...</p>
      </div>
    </div>
  )
}

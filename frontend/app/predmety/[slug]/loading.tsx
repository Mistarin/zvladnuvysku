import { Loader2 } from "lucide-react"

export default function SubjectLoading() {
  return (
    <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 justify-between items-start mb-8">
        <div className="space-y-4 w-full">
          {/* Breadcrumbs Skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
            <div className="text-muted-foreground">/</div>
            <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-16 h-8 bg-muted animate-pulse rounded"></div>
            <div className="w-20 h-8 bg-muted animate-pulse rounded-full"></div>
          </div>
          
          {/* Title Skeleton */}
          <div className="h-10 sm:h-12 w-3/4 md:w-1/2 bg-muted animate-pulse rounded-lg"></div>
          
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="w-24 h-5 bg-muted animate-pulse rounded"></div>
            <div className="w-32 h-5 bg-muted animate-pulse rounded"></div>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Tags Skeleton */}
          <div className="flex gap-2">
            <div className="w-20 h-6 bg-muted animate-pulse rounded-full"></div>
            <div className="w-24 h-6 bg-muted animate-pulse rounded-full"></div>
            <div className="w-16 h-6 bg-muted animate-pulse rounded-full"></div>
          </div>

          {/* Description Skeleton */}
          <div className="space-y-3">
            <div className="w-32 h-6 bg-muted animate-pulse rounded mb-4"></div>
            <div className="w-full h-4 bg-muted animate-pulse rounded"></div>
            <div className="w-full h-4 bg-muted animate-pulse rounded"></div>
            <div className="w-5/6 h-4 bg-muted animate-pulse rounded"></div>
            <div className="w-4/6 h-4 bg-muted animate-pulse rounded"></div>
          </div>

          <div className="h-px bg-border/50 w-full my-6"></div>

          {/* Target Audience Skeleton */}
          <div className="space-y-3">
            <div className="w-40 h-6 bg-muted animate-pulse rounded mb-4"></div>
            <div className="w-full h-4 bg-muted animate-pulse rounded"></div>
            <div className="w-3/4 h-4 bg-muted animate-pulse rounded"></div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          <div className="glass-card p-6 flex flex-col items-center justify-center space-y-4 min-h-[200px]">
             <Loader2 className="w-8 h-8 text-primary animate-spin" />
             <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
          </div>
          
          {/* Teachers Skeleton */}
          <div className="glass-card p-6 space-y-4">
            <div className="w-24 h-6 bg-muted animate-pulse rounded"></div>
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-muted animate-pulse"></div>
               <div className="space-y-2">
                  <div className="w-32 h-4 bg-muted animate-pulse rounded"></div>
                  <div className="w-20 h-3 bg-muted animate-pulse rounded"></div>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-muted animate-pulse"></div>
               <div className="space-y-2">
                  <div className="w-28 h-4 bg-muted animate-pulse rounded"></div>
                  <div className="w-24 h-3 bg-muted animate-pulse rounded"></div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

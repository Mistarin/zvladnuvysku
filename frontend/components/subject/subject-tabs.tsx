import Link from 'next/link'
import { Star, BookOpen, FileText } from 'lucide-react'

interface SubjectTabsProps {
  basePath: string
  activeTab: Tab
  reviewCount: number
  materialCount: number
  deckCount: number
}

export type Tab = 'recenze' | 'prehled' | 'materialy'

function TabBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-[11px] font-bold tabular-nums text-primary">
      {count}
    </span>
  )
}

export function SubjectTabs({
  basePath,
  activeTab,
  reviewCount,
  materialCount,
  deckCount,
}: SubjectTabsProps) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'prehled',
      label: 'Přehled',
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      id: 'recenze',
      label: 'Recenze',
      icon: <Star className="h-4 w-4" />,
      badge: reviewCount,
    },
    {
      id: 'materialy',
      label: 'Materiály',
      icon: <FileText className="h-4 w-4" />,
      badge: materialCount + deckCount,
    },
  ]

  return (
    <div className="mt-6">
      <div
        role="tablist"
        aria-label="Sekce předmětu"
        className="mb-6 flex gap-1 rounded-2xl border border-white/5 bg-muted/40 p-1 backdrop-blur-sm"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            href={tab.id === 'prehled' ? basePath : `${basePath}?tab=${tab.id}`}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm shadow-black/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="hidden sm:block">{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge !== undefined && <TabBadge count={tab.badge} />}
          </Link>
        ))}
      </div>
    </div>
  )
}

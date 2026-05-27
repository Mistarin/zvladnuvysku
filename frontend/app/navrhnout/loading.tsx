import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="container mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold text-foreground">Navrhnout předmět</h1>
        <p className="text-muted-foreground">
          Chybí ti tady nějaký předmět, nebo máš lepší informace? Pošli nám návrh a moderátor ho brzy zkontroluje.
        </p>
      </div>
      
      {/* Skeleton Form */}
      <div className="space-y-6 opacity-60">
        <div className="glass-card p-6 h-32 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/50" />
        </div>
        <div className="glass-card p-6 h-96 bg-muted/20 animate-pulse" />
        <div className="glass-card p-6 h-32 bg-muted/20 animate-pulse" />
        <div className="h-12 rounded-xl bg-muted animate-pulse" />
      </div>
    </div>
  )
}

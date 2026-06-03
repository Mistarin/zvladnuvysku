'use client'

type ReviewVisibilityFieldProps = {
  isAnonymous: boolean
  onChange: (value: boolean) => void
}

export function ReviewVisibilityField({ isAnonymous, onChange }: ReviewVisibilityFieldProps) {
  return (
    <div className="space-y-2">
      <span className="text-xs text-muted-foreground">Viditelnost recenze</span>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
            !isAnonymous
              ? 'border-primary/40 bg-primary/10 text-foreground'
              : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <div className="font-medium text-foreground">Veřejná recenze</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Autor je vidět, schválená recenze přidá 1 bod do XP a Hall of Fame.
          </div>
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
            isAnonymous
              ? 'border-primary/40 bg-primary/10 text-foreground'
              : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <div className="font-medium text-foreground">Anonymní recenze</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Autor se veřejně nezobrazuje a recenze nepřidává XP ani body.
          </div>
        </button>
      </div>
    </div>
  )
}

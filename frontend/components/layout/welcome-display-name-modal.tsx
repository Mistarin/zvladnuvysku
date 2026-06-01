'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { Loader2, Sparkles } from 'lucide-react'
import { upsertDisplayName } from '@/app/actions/hall-of-fame'

interface WelcomeDisplayNameModalProps {
  initialOpen?: boolean
  initialDisplayName: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onCompleted?: (displayName: string) => void
  clearCookieOnClose?: boolean
}

function clearNeedsDisplayNameCookie() {
  document.cookie = 'needs_display_name=; Max-Age=0; Path=/; SameSite=Lax'
}

export function WelcomeDisplayNameModal({
  initialOpen = false,
  initialDisplayName,
  open,
  onOpenChange,
  onCompleted,
  clearCookieOnClose = false,
}: WelcomeDisplayNameModalProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(initialOpen)
  const [value, setValue] = useState(initialDisplayName)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen

  const setOpen = (nextOpen: boolean) => {
    if (!nextOpen && clearCookieOnClose) {
      clearNeedsDisplayNameCookie()
    }

    if (!isControlled) {
      setInternalOpen(nextOpen)
    }

    onOpenChange?.(nextOpen)
  }

  const handleSkip = () => {
    setOpen(false)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await upsertDisplayName(value)

      if (!result.success) {
        setError(result.error)
        return
      }

      clearNeedsDisplayNameCookie()
      onCompleted?.(value.trim())
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={setOpen}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[calc(100vw-2rem)] max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
          <div className="space-y-4">
            <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>

            <div className="space-y-1.5">
              <Dialog.Title className="text-xl font-semibold text-foreground">
                Vítej v ZvládnuVýšku
              </Dialog.Title>
              <Dialog.Description className="text-sm leading-6 text-muted-foreground">
                Nastav si veřejné jméno. Uvidí ho ostatní u tvých recenzí, veřejného profilu a v Hall of Fame.
              </Dialog.Description>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="welcome-display-name" className="text-sm font-medium text-foreground">
                  Veřejné jméno
                </label>
                <input
                  id="welcome-display-name"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="Např. Jana z FSS"
                  maxLength={40}
                  autoFocus
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Teď ne
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Uložit a pokračovat
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

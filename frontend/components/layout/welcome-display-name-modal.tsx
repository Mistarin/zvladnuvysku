'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowLeft, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { upsertPublicProfileIdentity } from '@/app/actions/hall-of-fame'
import { FACULTIES } from '@/lib/faculties'
import {
  getPublicProfileIdentity,
  type PublicProfileIdentity,
} from '@/lib/public-profile-identity'

interface WelcomeDisplayNameModalProps {
  initialOpen?: boolean
  initialDisplayName: string
  initialFaculty?: string | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onCompleted?: (identity: PublicProfileIdentity) => void
  clearCookieOnClose?: boolean
}

type ModalStep = 1 | 2

function clearNeedsDisplayNameCookie() {
  document.cookie = 'needs_display_name=; Max-Age=0; Path=/; SameSite=Lax'
}

function validateDisplayName(value: string) {
  const trimmed = value.trim()

  if (trimmed.length < 2 || trimmed.length > 40) {
    return 'Veřejné jméno musí mít 2 až 40 znaků.'
  }

  return null
}

export function WelcomeDisplayNameModal({
  initialOpen = false,
  initialDisplayName,
  initialFaculty = null,
  open,
  onOpenChange,
  onCompleted,
  clearCookieOnClose = false,
}: WelcomeDisplayNameModalProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(initialOpen)
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [faculty, setFaculty] = useState(getPublicProfileIdentity({ faculty: initialFaculty }).faculty)
  const [step, setStep] = useState<ModalStep>(1)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const identity = getPublicProfileIdentity({
      display_name: initialDisplayName,
      faculty: initialFaculty,
    })

    setDisplayName(identity.displayName)
    setFaculty(identity.faculty)
    setStep(1)
    setError(null)
  }, [initialDisplayName, initialFaculty, isOpen])

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

  const handleContinue = () => {
    const validationError = validateDisplayName(displayName)

    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setStep(2)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (step === 1) {
      handleContinue()
      return
    }

    const validationError = validateDisplayName(displayName)
    if (validationError) {
      setStep(1)
      setError(validationError)
      return
    }

    if (!faculty) {
      setError('Vyber fakultu, která se má zobrazovat na veřejném profilu.')
      return
    }

    startTransition(async () => {
      const identity = {
        displayName: displayName.trim(),
        faculty,
      } satisfies PublicProfileIdentity

      const result = await upsertPublicProfileIdentity(identity)

      if (!result.success) {
        setError(result.error)
        return
      }

      clearNeedsDisplayNameCookie()
      onCompleted?.(identity)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-[calc(100vw-2rem)] max-w-xl translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95">
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <span className={step === 1 ? 'text-primary' : undefined}>1. Jméno</span>
                <span>/</span>
                <span className={step === 2 ? 'text-primary' : undefined}>2. Fakulta</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Dialog.Title className="text-xl font-semibold text-foreground">
                {step === 1 ? 'Nastav si veřejné jméno' : 'Vyber si fakultu'}
              </Dialog.Title>
              <Dialog.Description className="text-sm leading-6 text-muted-foreground">
                {step === 1
                  ? 'Tvoje veřejné jméno uvidí ostatní u recenzí, veřejného profilu a v Hall of Fame.'
                  : 'Fakulta je povinná součást veřejného profilu. Zobrazí se na profilu i v Hall of Fame.'}
              </Dialog.Description>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {step === 1 ? (
                <div className="space-y-2">
                  <label htmlFor="welcome-display-name" className="text-sm font-medium text-foreground">
                    Veřejné jméno
                  </label>
                  <input
                    id="welcome-display-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Např. Jana z FSS"
                    maxLength={40}
                    autoFocus
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-xs text-muted-foreground">
                    2 až 40 znaků. Nemusí být unikátní.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">Fakulta</label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {FACULTIES.map((item) => {
                      const isActive = faculty === item.value

                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setFaculty(item.value)
                            setError(null)
                          }}
                          className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                            isActive
                              ? 'border-primary/40 bg-primary/10 text-foreground'
                              : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{item.shortLabel}</p>
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.label}</p>
                            </div>
                            {isActive ? <CheckCircle2 className="size-4 text-primary" /> : null}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Teď ne
                </button>

                <div className="flex items-center justify-end gap-2">
                  {step === 2 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null)
                        setStep(1)
                      }}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <ArrowLeft className="size-4" />
                      Zpět
                    </button>
                  ) : null}
                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                    {step === 1 ? 'Pokračovat' : 'Uložit a pokračovat'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

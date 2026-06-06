'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, ArrowLeft, Loader2, Sparkles } from 'lucide-react'
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
  initialSecondaryFaculty?: string | null
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
  initialSecondaryFaculty = null,
  open,
  onOpenChange,
  onCompleted,
  clearCookieOnClose = false,
}: WelcomeDisplayNameModalProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(initialOpen)
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [faculty, setFaculty] = useState(getPublicProfileIdentity({ faculty: initialFaculty, secondary_faculty: initialSecondaryFaculty }).faculty)
  const [secondaryFaculty, setSecondaryFaculty] = useState(
    getPublicProfileIdentity({ faculty: initialFaculty, secondary_faculty: initialSecondaryFaculty }).secondaryFaculty
  )
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
      secondary_faculty: initialSecondaryFaculty,
    })

    setDisplayName(identity.displayName)
    setFaculty(identity.faculty)
    setSecondaryFaculty(identity.secondaryFaculty)
    setStep(1)
    setError(null)
  }, [initialDisplayName, initialFaculty, initialSecondaryFaculty, isOpen])

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

    if (secondaryFaculty && secondaryFaculty === faculty) {
      setError('Druhá fakulta se musí lišit od primární.')
      return
    }

    startTransition(async () => {
      const identity = {
        displayName: displayName.trim(),
        faculty,
        secondaryFaculty,
        faculties: [faculty, secondaryFaculty].filter((item): item is typeof faculty => Boolean(item)),
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
                  <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <p>
                      Kvůli soukromí nedoporučujeme používat celé pravé jméno. Můžeš, ale veřejně se bude zobrazovat u recenzí, profilu a v Hall of Fame.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label htmlFor="welcome-primary-faculty" className="text-sm font-medium text-foreground">
                      Primární fakulta
                    </label>
                    <select
                      id="welcome-primary-faculty"
                      value={faculty}
                      onChange={(event) => {
                        const nextFaculty = event.target.value as typeof faculty
                        setFaculty(nextFaculty)
                        if (secondaryFaculty === nextFaculty) {
                          setSecondaryFaculty('')
                        }
                        setError(null)
                      }}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Vyber fakultu</option>
                      {FACULTIES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="welcome-secondary-faculty" className="text-sm font-medium text-foreground">
                      Druhá fakulta
                      <span className="ml-2 text-xs font-normal text-muted-foreground">(volitelné)</span>
                    </label>
                    <select
                      id="welcome-secondary-faculty"
                      value={secondaryFaculty}
                      onChange={(event) => {
                        setSecondaryFaculty(event.target.value as typeof secondaryFaculty)
                        setError(null)
                      }}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Bez druhé fakulty</option>
                      {FACULTIES.filter((item) => item.value !== faculty).map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-xl border border-border bg-background/70 px-4 py-3 text-xs text-muted-foreground">
                    Veřejně se budou zobrazovat až dvě fakulty. Primární je povinná, druhá je volitelná.
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

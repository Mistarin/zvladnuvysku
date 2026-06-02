import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Jak funguje bodový systém? | Zvládnu vyšku',
  description:
    'Zjisti, za co na Zvládnu vyšku získáš body a jak se počítá pořadí v žebříčku přispěvatelů.',
}

export default function JakToFunguePage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-12 space-y-10">
      {/* Hero */}
      <div className="glass-card rounded-[2rem] p-8 sm:p-12 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-4xl mb-2">
          🏆
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
          Jak funguje bodový systém?
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl mx-auto leading-relaxed">
          Body se připisují za schválené příspěvky a určují pořadí v žebříčku aktivních přispěvatelů.
          Každý materiál navíc prochází moderací, aby se na web dostaly opravdu použitelné podklady.
        </p>
      </div>

      {/* Materiály */}
      <section className="glass-card rounded-[1.75rem] p-7 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📄</span>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Body za studijní materiály</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Body se připíšou po schválení moderátorem</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rozsah materiálu</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">Body</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-foreground">Méně než 5 stran</td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-semibold text-sm">0</span>
                </td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-foreground">5–15 stran</td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">2</span>
                </td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-foreground font-medium">16+ stran</td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary font-semibold text-sm">3</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Balíčky kartiček */}
      <section className="glass-card rounded-[1.75rem] p-7 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🃏</span>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Body za balíčky kartiček</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Body se připíšou po schválení moderátorem</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Počet otázek v balíčku</th>
                <th className="px-4 py-3 text-right font-semibold text-foreground">Body</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-foreground">Do 50 otázek</td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">1</span>
                </td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-foreground">50–100 otázek</td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary font-semibold text-sm">2</span>
                </td>
              </tr>
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-foreground font-medium">101+ otázek</td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-sm">3</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Předměty */}
      <section className="glass-card rounded-[1.75rem] p-7 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Body za návrhy předmětů</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Stejně funguje nový návrh i úprava existujícího předmětu</p>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <span className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/20 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            1
          </span>
          <div>
            <p className="font-semibold text-foreground">Schválený návrh předmětu</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Za schválený nový návrh i schválenou úpravu předmětu získáš 1 bod.
            </p>
          </div>
        </div>
      </section>

      {/* Tipy */}
      <section className="glass-card rounded-[1.75rem] p-7 sm:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💡</span>
          <h2 className="text-xl font-semibold text-foreground">Tipy pro získání více bodů</h2>
        </div>

        <ul className="space-y-3">
          {[
            {
              icon: '📦',
              text: 'Posílej co nejvíce stran pohromadě — jeden velký soubor vydá více než pět malých.',
            },
            {
              icon: '🚫',
              text: 'Vyhýbej se AI slopu a odfláknutým materiálům. Takové podklady budeme vracet ke kontrole.',
            },
            {
              icon: '📏',
              text: 'Materiály pod 5 stran nedávají žádné body — vyplatí se je spojit s dalšími.',
            },
          ].map(({ icon, text }) => (
            <li
              key={text}
              className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3"
            >
              <span className="mt-0.5 text-lg flex-shrink-0">{icon}</span>
              <span className="text-sm text-foreground">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <div className="text-center pb-4">
        <a
          href="/navrhnout"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold accent-gradient text-white hover:opacity-90 transition-all"
        >
          Navrhnout předmět →
        </a>
      </div>
    </main>
  )
}

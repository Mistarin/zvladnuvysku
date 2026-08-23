import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Co nabízí ZvládnuVýšku? | ZvládnuVýšku",
  description:
    "Přehled funkcí ZvládnuVýšku pro studenty Ostravské univerzity.",
};

const PILLARS = [
  {
    title: "Od pasivního stahování k aktivnímu učení",
    text: "Ke každému materiálu můžeš navázat interaktivní kartičky se spaced repetition a procvičovat látku hned po čtení.",
  },
  {
    title: "Obsah s jasnými pravidly",
    text: "Přihlášení přes školní e-mail @osu.cz a moderace obsahu pomáhají udržet komunitu spojenou s OU.",
  },
  {
    title: "Šité na míru Ostravské univerzitě",
    text: "Obsah je uspořádaný podle fakult, vyučujících a předmětů Ostravské univerzity.",
  },
];

const DETAILS = [
  "Přehledy předmětů s obtížností, docházkou, kredity a zkušenostmi studentů.",
  "Materiály přiřazené ke konkrétním předmětům a vyučujícím.",
  "Veřejné kartičky se spaced repetition pro průběžné procvičování.",
  "Moderovaný obsah a přihlášení přes školní e-mail @osu.cz.",
];

export default function ProcNePrimatPage() {
  return (
    <main className="container mx-auto max-w-5xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <section className="surface-card rounded-lg p-8 sm:p-12">
        <div className="max-w-3xl space-y-5">
          <span className="inline-flex rounded-md border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Studentský hub Ostravské univerzity
          </span>
          <h1 className="text-3xl font-bold text-foreground sm:text-5xl">
            Informace, které se hodí před zápisem předmětu
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            ZvládnuVýšku spojuje recenze, schválené studijní materiály a interaktivní kartičky pro studenty Ostravské univerzity.
          </p>
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Jak web pomáhá při studiu</h2>
          <p className="text-muted-foreground">
            Vyber si předmět, projdi zkušenosti ostatních a začni procvičovat.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {PILLARS.map((pillar, index) => (
            <article key={pillar.title} className="surface-card rounded-lg p-6">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-sm font-bold text-primary">
                0{index + 1}
              </div>
              <h3 className="text-lg font-semibold text-foreground">{pillar.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{pillar.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="surface-card rounded-lg p-7">
        <h2 className="text-2xl font-bold text-foreground">Co tu najdeš</h2>
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {DETAILS.map((item) => (
            <li key={item} className="border-l-2 border-primary px-4 py-3 text-sm text-foreground">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="surface-card rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Začni u předmětů, které řešíš</h2>
        <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
          Projdi si reálné recenze, schválené materiály a kartičky pro Ostravskou univerzitu.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/predmety"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white primary-action hover:opacity-90"
          >
            Procházet předměty
          </Link>
          <Link
            href="/flashcardy"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted/50"
          >
            Prohlédnout kartičky
          </Link>
        </div>
      </section>
    </main>
  );
}

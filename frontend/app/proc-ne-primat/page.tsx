import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Proč ne Primát? | ZvládnuVýšku",
  description:
    "Proč je ZvládnuVýšku lepší volba pro studenty Ostravské univerzity než staré materiálové portály.",
};

const PILLARS = [
  {
    title: "Od pasivního stahování k aktivnímu učení",
    text: "Místo pouhého sběru PDF dává ZvládnuVýšku studentům i interaktivní kartičky se spaced repetition. Od materiálu se tak během pár vteřin dostaneš rovnou k procvičování.",
  },
  {
    title: "Důvěra a čistota místo komerce",
    text: "Žádné bannery, žádné prémiové účty, žádný spam. Díky přihlášení přes školní e-mail @osu.cz a moderaci obsahu víš, že se pohybuješ mezi reálnými studenty OU.",
  },
  {
    title: "Šité na míru Ostravské univerzitě",
    text: "Platforma respektuje fakulty, vyučující i studijní realitu Ostravské univerzity. Není to anonymní skladiště všeho pro všechny, ale konkrétní studentský hub pro OU.",
  },
];

const DRAWBACKS = [
  "Paywally, virtuální měny nebo jiné třecí plochy mezi studentem a jedním souborem.",
  "Přetížené rozhraní plné reklam, trackerů a rušivých prvků, které na mobilu jen překážejí.",
  "Staré nebo duplicitní materiály bez jasné vazby na aktuální výuku a bez kvalitativního filtru.",
  "Pouze pasivní archiv: stáhneš PDF a všechno další učení už je čistě na tobě.",
];

const ADVANTAGES = [
  "100 % zdarma a bez podmínek. Žádné body za klikání, žádné skryté tarify.",
  "Rychlý a čistý web bez reklam, navržený tak, aby fungoval i na mobilu bez kompromisů.",
  "Ověřená komunita Ostravské univerzity díky přístupu přes @osu.cz a moderovaným příspěvkům.",
  "Recenze, schválené materiály a chytré kartičky se SM-2 na jednom místě.",
];

export default function ProcNePrimatPage() {
  return (
    <main className="container mx-auto max-w-5xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <section className="glass-card rounded-[2rem] p-8 sm:p-12">
        <div className="max-w-3xl space-y-5">
          <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Studentský hub OU
          </span>
          <h1 className="text-3xl font-bold text-foreground sm:text-5xl">
            Proč raději ZvládnuVýšku než staré materiálové portály
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            ZvládnuVýšku není další pasivní archiv souborů. Je to moderní, rychlý a bezreklamní
            studijní hub vytvořený studenty Ostravské univerzity pro studenty Ostravské univerzity.
            Spojuje důvěryhodné recenze, schválené studijní materiály a interaktivní kartičky na
            jednom místě.
          </p>
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Tři pilíře, proč je ZvládnuVýšku lepší</h2>
          <p className="text-muted-foreground">
            Cíl není jen stáhnout si soubor, ale dostat se rychleji k pochopení látky.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PILLARS.map((pillar, index) => (
            <article key={pillar.title} className="glass-card rounded-[1.5rem] p-6">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-sm font-bold text-primary">
                0{index + 1}
              </div>
              <h3 className="text-lg font-semibold text-foreground">{pillar.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{pillar.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-[1.75rem] border border-destructive/15 bg-destructive/5 p-7">
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">Proč ne staré portály</h2>
            <p className="text-sm text-muted-foreground">
              Materiálové portály starého typu často znamenají víc tření, víc chaosu a míň skutečné hodnoty.
            </p>
          </div>
          <ul className="mt-5 space-y-3">
            {DRAWBACKS.map((item) => (
              <li key={item} className="rounded-xl border border-destructive/10 bg-background/70 px-4 py-3 text-sm text-foreground">
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-[1.75rem] border border-emerald-500/20 bg-emerald-500/10 p-7">
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">Proč raději ZvládnuVýšku</h2>
            <p className="text-sm text-muted-foreground">
              Všechno důležité pro studium OU na jednom místě, bez podmínek a bez rušení.
            </p>
          </div>
          <ul className="mt-5 space-y-3">
            {ADVANTAGES.map((item) => (
              <li key={item} className="rounded-xl border border-emerald-500/15 bg-background/70 px-4 py-3 text-sm text-foreground">
                {item}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="glass-card rounded-[1.75rem] p-8 text-center">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Sečteno a podtrženo</h2>
        <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
          Na starých portálech ztrácíš čas i peníze. Na ZvládnuVýšku získáš obojí zpět: reálné recenze,
          schválené studijní materiály a chytré kartičky pro Ostravskou univerzitu na jednom místě,
          bez reklam a bez zbytečných bariér.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/predmety"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white accent-gradient hover:opacity-90"
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

import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import {
  LegalCard,
  LegalLead,
  LegalList,
  LegalPageShell,
  legalOperator,
  legalUpdatedAt,
} from "@/components/legal/legal-content";

export const metadata: Metadata = {
  title: "Zásady zpracování osobních údajů",
  description:
    "Informace o tom, jak Zvládnu Výšku zpracovává osobní údaje uživatelů a návštěvníků webu.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Zásady zpracování osobních údajů"
      description="Jaké osobní údaje na Zvládnu Výšku zpracováváme, proč je potřebujeme a jaká máte práva."
      icon={ShieldCheck}
    >
      <LegalCard title="Správce osobních údajů">
        <LegalLead>
          Správcem osobních údajů je provozovatel webu Zvládnu Výšku:
        </LegalLead>
        <p>
          <strong className="text-foreground">{legalOperator.name}</strong>
          <br />
          {legalOperator.address}
          <br />
          IČO: {legalOperator.ico}
          <br />
          Fyzická osoba zapsaná v živnostenském rejstříku.
          <br />
          E-mail:{" "}
          <a className="text-primary hover:underline" href={`mailto:${legalOperator.email}`}>
            {legalOperator.email}
          </a>
        </p>
        <p>
          Pro tento web není jmenován samostatný pověřenec pro ochranu osobních údajů. Kontaktním
          místem pro dotazy ke zpracování osobních údajů a pro uplatnění vašich práv je uvedený
          e-mail správce.
        </p>
      </LegalCard>

      <LegalCard title="Jaké údaje zpracováváme">
        <LegalList
          items={[
            <>identifikační a kontaktní údaje spojené s účtem, zejména e-mail a volitelně veřejné zobrazované jméno,</>,
            <>údaje o profilu, které sami doplníte, například fakulta nebo druhá fakulta,</>,
            <>obsah, který na web nahrajete nebo odešlete, například recenze, komentáře, návrhy předmětů, hodnocení vyučujících, materiály, balíčky kartiček nebo zpětnou vazbu,</>,
            <>technické údaje o používání webu, například IP adresa, typ zařízení, základní logy o přihlášení a bezpečnostní záznamy,</>,
            <>údaje o návštěvnosti a používání webu v rozsahu služby Google Analytics, pokud je na webu aktivní analytické měření.</>,
          ]}
        />
      </LegalCard>

      <LegalCard title="Účely a právní základy zpracování">
        <LegalList
          items={[
            <>vedení a zabezpečení uživatelského účtu a přihlášení: plnění smlouvy a náš oprávněný zájem na bezpečném provozu platformy,</>,
            <>zveřejnění uživatelského obsahu, správa příspěvků, moderace a řešení nahlášení: plnění smlouvy a oprávněný zájem na provozu komunity,</>,
            <>anonymní recenze a hodnocení: plnění smlouvy; anonymita se vztahuje k veřejnému zobrazení, nikoli k tomu, že bychom autora interně vůbec neevidovali,</>,
            <>prevence zneužití, spamu, porušování pravidel a ochrana právních nároků: oprávněný zájem,</>,
            <>odpovědi na vaše dotazy a řešení podpory: oprávněný zájem nebo plnění smlouvy podle povahy komunikace,</>,
            <>analytika návštěvnosti a zlepšování webu prostřednictvím Google Analytics: váš souhlas, pokud je podle práva vyžadován.</>,
          ]}
        />
      </LegalCard>

      <LegalCard title="Komu mohou být údaje zpřístupněny">
        <p>
          Osobní údaje mohou být zpřístupněny poskytovatelům služeb, které používáme pro technický
          provoz platformy, zejména poskytovateli hostingu a infrastruktury aplikace, poskytovateli
          databáze, autentizace a souborového úložiště a poskytovateli analytických služeb.
        </p>
        <p>
          Pokud je na webu aktivní analytické měření, příjemcem analytických dat může být
          společnost Google v rámci služby Google Analytics. Údaje dále můžeme zpřístupnit, pokud
          nám to ukládá právní předpis nebo je to nutné pro ochranu našich práv.
        </p>
      </LegalCard>

      <LegalCard title="Doba uchování">
        <LegalList
          items={[
            <>údaje k účtu uchováváme po dobu existence účtu a následně po dobu nezbytnou k ochraně právních nároků, zpravidla nejdéle 3 roky,</>,
            <>veřejné příspěvky, recenze a nahrané materiály uchováváme po dobu jejich zveřejnění a dále po rozumnou dobu pro doložení moderace, řešení sporů a ochranu práv,</>,
            <>bezpečnostní a provozní logy uchováváme po dobu nezbytnou pro provoz, zabezpečení a diagnostiku služby,</>,
            <>analytické údaje se řídí nastavením používaného analytického nástroje a souvisejících cookies.</>,
          ]}
        />
      </LegalCard>

      <LegalCard title="Vaše práva">
        <LegalList
          items={[
            <>právo na přístup k osobním údajům,</>,
            <>právo na opravu nepřesných nebo neúplných údajů,</>,
            <>právo na výmaz, pokud jsou splněny podmínky GDPR,</>,
            <>právo na omezení zpracování,</>,
            <>právo vznést námitku proti zpracování založenému na oprávněném zájmu,</>,
            <>právo odvolat souhlas, pokud je zpracování založeno na souhlasu,</>,
            <>právo podat stížnost u Úřadu pro ochranu osobních údajů.</>,
          ]}
        />
      </LegalCard>

      <LegalCard title="Cookies a další úložiště">
        <p>
          Podrobnější přehled cookies a místních úložišť najdete na stránce{" "}
          <Link className="text-primary hover:underline" href="/cookies">
            Cookies
          </Link>
          . Tato stránka je součástí zásad ochrany soukromí a vysvětluje, jak web používá nezbytné
          cookies, přihlašovací cookies, analytiku a technická úložiště v prohlížeči.
        </p>
      </LegalCard>

      <LegalCard title="Aktualizace dokumentu">
        <p>Tyto zásady jsme naposledy aktualizovali dne {legalUpdatedAt}.</p>
      </LegalCard>
    </LegalPageShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { FileCheck2 } from "lucide-react";
import {
  LegalCard,
  LegalLead,
  LegalList,
  LegalPageShell,
  legalOperator,
  legalUpdatedAt,
} from "@/components/legal/legal-content";

export const metadata: Metadata = {
  title: "Podmínky užívání",
  description:
    "Pravidla používání platformy Zvládnu Výšku pro účty, recenze, materiály, kartičky a moderaci.",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Podmínky užívání"
      description="Pravidla pro používání platformy Zvládnu Výšku, uživatelský obsah, moderaci a odpovědnost."
      icon={FileCheck2}
    >
      <LegalCard title="1. Provozovatel a účel služby">
        <LegalLead>
          Zvládnu Výšku je studentská platforma pro sdílení zkušeností, hodnocení, studijních
          materiálů, kartiček a informací o předmětech a vyučujících.
        </LegalLead>
        <p>
          Provozovatelem služby je {legalOperator.name}, IČO {legalOperator.ico}. Kontaktní údaje
          najdete na stránce <Link className="text-primary hover:underline" href="/legal">Právní a kontaktní informace</Link>.
        </p>
      </LegalCard>

      <LegalCard title="2. Uživatelský účet">
        <LegalList
          items={[
            <>za správnost údajů použitých při registraci a za bezpečnost svého účtu odpovídá uživatel,</>,
            <>nesmíte vydávat svůj účet za jinou osobu ani používat cizí identitu,</>,
            <>jeden uživatel nesmí zneužívat více účtů k manipulaci hodnocení, spamu nebo obcházení moderace,</>,
            <>můžeme omezit nebo zablokovat účet, pokud porušuje tato pravidla nebo ohrožuje bezpečnost webu.</>,
          ]}
        />
      </LegalCard>

      <LegalCard title="3. Uživatelský obsah">
        <p>Uživatel odpovídá za obsah, který na platformě zveřejní nebo nahraje.</p>
        <LegalList
          items={[
            <>recenze, komentáře a hodnocení mají popisovat reálnou zkušenost se studiem, nikoli sloužit k útokům na konkrétní osobu,</>,
            <>materiály, balíčky kartiček a jiné soubory smíte nahrávat jen tehdy, pokud máte právo je sdílet,</>,
            <>anonymní recenze jsou anonymní vůči veřejnosti, ne vůči provozovateli při řešení zneužití,</>,
            <>odesláním obsahu dáváte provozovateli nevýhradní oprávnění tento obsah zobrazovat, ukládat, moderovat a odstraňovat v rozsahu nutném pro provoz webu.</>,
          ]}
        />
      </LegalCard>

      <LegalCard title="4. Zakázané jednání">
        <LegalList
          items={[
            <>spam, záměrné zahlcování platformy nebo automatizované zneužívání formulářů,</>,
            <>falešné recenze, manipulace s reputací předmětů nebo vyučujících a koordinované hlasování,</>,
            <>obtěžování, výhrůžky, osobní útoky, hate speech nebo zveřejňování osobních údajů třetích osob,</>,
            <>nahrávání materiálů, které porušují autorská práva, školní pravidla, obchodní tajemství nebo důvěrnost zkouškových podkladů,</>,
            <>pokoušení se o narušení bezpečnosti webu, obcházení omezení nebo neoprávněný přístup k cizím datům.</>,
          ]}
        />
      </LegalCard>

      <LegalCard title="5. Moderace a zásahy provozovatele">
        <p>
          Vyhrazujeme si právo obsah před zveřejněním nebo po zveřejnění moderovat, upravit
          metadata, odmítnout, skrýt nebo odstranit, pokud je v rozporu s právem, těmito
          podmínkami nebo pravidly komunity.
        </p>
        <p>
          Moderace může být automatická i ruční. Samotné odmítnutí příspěvku neznamená hodnocení
          osoby autora, ale provozní rozhodnutí o kvalitě, bezpečnosti nebo právní přijatelnosti
          obsahu.
        </p>
      </LegalCard>

      <LegalCard title="6. Mazání obsahu a účtu">
        <LegalList
          items={[
            <>uživatel může požádat o smazání účtu nebo konkrétního obsahu přes kontaktní e-mail,</>,
            <>některé záznamy si můžeme ponechat po nezbytnou dobu kvůli bezpečnosti, plnění právních povinností nebo ochraně právních nároků,</>,
            <>pokud obsah porušuje pravidla, můžeme jej odstranit i bez předchozí výzvy.</>,
          ]}
        />
      </LegalCard>

      <LegalCard title="7. Odpovědnost a omezení">
        <p>
          Platforma slouží k orientaci a sdílení zkušeností mezi studenty. Nezaručujeme úplnost,
          přesnost ani aktuálnost všech zveřejněných informací. Hodnocení, recenze a materiály jsou
          uživatelský obsah a mohou být subjektivní.
        </p>
        <p>
          Neodpovídáme za to, že informace na webu povedou ke konkrétním studijním výsledkům,
          rozhodnutím o zápisu nebo splnění školních povinností. Uživatelé používají službu na
          vlastní odpovědnost.
        </p>
      </LegalCard>

      <LegalCard title="8. Související dokumenty">
        <p>
          Tyto podmínky doplňují stránky{" "}
          <Link className="text-primary hover:underline" href="/privacy">
            Zásady zpracování osobních údajů
          </Link>
          ,{" "}
          <Link className="text-primary hover:underline" href="/community-guidelines">
            Pravidla komunity
          </Link>{" "}
          a{" "}
          <Link className="text-primary hover:underline" href="/copyright">
            Pravidla pro nahrávání materiálů
          </Link>
          .
        </p>
        <p>Tyto podmínky jsme naposledy aktualizovali dne {legalUpdatedAt}.</p>
      </LegalCard>
    </LegalPageShell>
  );
}

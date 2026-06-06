import type { Metadata } from "next";
import Link from "next/link";
import { Scale } from "lucide-react";
import {
  LegalCard,
  LegalLead,
  LegalList,
  LegalPageShell,
  legalOperator,
  legalUpdatedAt,
} from "@/components/legal/legal-content";

export const metadata: Metadata = {
  title: "Právní a kontaktní informace",
  description:
    "Identifikační údaje provozovatele webu Zvládnu Výšku a rozcestník na právní dokumenty platformy.",
};

export default function LegalPage() {
  return (
    <LegalPageShell
      title="Právní a kontaktní informace"
      description="Identifikace provozovatele, kontaktní údaje a rozcestník na hlavní právní dokumenty webu."
      icon={Scale}
    >
      <LegalCard title="Identifikace provozovatele">
        <LegalLead>
          Provozovatelem webu Zvládnu Výšku je:
        </LegalLead>
        <p>
          <strong className="text-foreground">{legalOperator.name}</strong>
          <br />
          {legalOperator.address}
          <br />
          IČO: {legalOperator.ico}
          <br />
          Fyzická osoba zapsaná v živnostenském rejstříku.
        </p>
      </LegalCard>

      <LegalCard title="Kontakt">
        <p>
          E-mail pro podporu, právní dotazy, nahlášení porušení práv i žádosti podle GDPR:
        </p>
        <p>
          <a className="text-primary hover:underline" href={`mailto:${legalOperator.email}`}>
            {legalOperator.email}
          </a>
        </p>
      </LegalCard>

      <LegalCard title="Povaha služby">
        <p>
          Zvládnu Výšku je neoficiální studentská platforma vytvořená studentem pro studenty. Web
          není oficiální službou Ostravské univerzity ani jejích fakult.
        </p>
        <p>
          Obsah na webu může být uživatelský, subjektivní a neúplný. Uživatel by si měl zásadní
          informace vždy ověřit i z oficiálních zdrojů školy.
        </p>
      </LegalCard>

      <LegalCard title="Právní dokumenty">
        <LegalList
          items={[
            <Link key="privacy" className="text-primary hover:underline" href="/privacy">Zásady zpracování osobních údajů</Link>,
            <Link key="cookies" className="text-primary hover:underline" href="/cookies">Cookies a technická úložiště</Link>,
            <Link key="terms" className="text-primary hover:underline" href="/terms">Podmínky užívání</Link>,
            <Link key="community" className="text-primary hover:underline" href="/community-guidelines">Pravidla komunity</Link>,
            <Link key="copyright" className="text-primary hover:underline" href="/copyright">Pravidla pro nahrávání materiálů a autorská práva</Link>,
          ]}
        />
      </LegalCard>

      <LegalCard title="Aktualizace dokumentu">
        <p>Tuto stránku jsme naposledy aktualizovali dne {legalUpdatedAt}.</p>
      </LegalCard>
    </LegalPageShell>
  );
}

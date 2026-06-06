import type { Metadata } from "next";
import { Copyright } from "lucide-react";
import {
  LegalCard,
  LegalLead,
  LegalList,
  LegalPageShell,
  legalOperator,
  legalUpdatedAt,
} from "@/components/legal/legal-content";

export const metadata: Metadata = {
  title: "Pravidla pro nahrávání materiálů",
  description:
    "Pravidla pro autorská práva, nahrávání studijních materiálů, kartiček a postup při nahlášení porušení.",
};

export default function CopyrightPage() {
  return (
    <LegalPageShell
      title="Pravidla pro nahrávání materiálů a autorská práva"
      description="Co smíte nahrávat, co ne, a jak postupovat při nahlášení porušení práv."
      icon={Copyright}
    >
      <LegalCard title="Základní pravidlo">
        <LegalLead>
          Nahrávat můžete pouze takový obsah, ke kterému máte právo sdílení nebo jehož sdílení je
          právně a školně v pořádku.
        </LegalLead>
        <p>
          Týká se to zejména PDF materiálů, prezentací, skript, poznámek, zpracovaných otázek,
          balíčků kartiček a jiných studijních podkladů.
        </p>
      </LegalCard>

      <LegalCard title="Co je zakázané nahrávat">
        <LegalList
          items={[
            <>cizí placené materiály, učebnice, skripta nebo databáze bez souhlasu držitele práv,</>,
            <>prezentace, interní podklady a materiály vyučujících, pokud je nemáte právo sdílet,</>,
            <>zkouškové podklady, uniklé zadání nebo jiné důvěrné dokumenty, jejichž zveřejnění by porušovalo pravidla školy nebo práva třetích osob,</>,
            <>obsah stažený z jiných webů bez oprávnění k dalšímu šíření.</>,
          ]}
        />
      </LegalCard>

      <LegalCard title="Co obvykle v pořádku je">
        <LegalList
          items={[
            <>vlastní poznámky, shrnutí, vlastní zpracované otázky a vlastní přehledy k předmětu,</>,
            <>vlastní balíčky kartiček vytvořené z vlastního studia,</>,
            <>obsah, který je pod licencí umožňující další sdílení, pokud dodržíte podmínky takové licence.</>,
          ]}
        />
      </LegalCard>

      <LegalCard title="Licence a oprávnění pro provoz webu">
        <p>
          Odesláním materiálu potvrzujete, že jste oprávněni jej sdílet. Současně poskytujete
          provozovateli nevýhradní oprávnění tento obsah ukládat, zobrazovat, technicky upravovat a
          moderovat v rozsahu nutném pro provoz platformy.
        </p>
      </LegalCard>

      <LegalCard title="Nahlášení porušení práv">
        <p>
          Pokud se domníváte, že na webu je obsah porušující autorská nebo jiná práva, napište na{" "}
          <a className="text-primary hover:underline" href={`mailto:${legalOperator.email}`}>
            {legalOperator.email}
          </a>
          .
        </p>
        <p>Do zprávy ideálně uveďte:</p>
        <LegalList
          items={[
            <>odkaz na konkrétní obsah,</>,
            <>popis toho, jaké právo je podle vás porušeno,</>,
            <>vaše kontaktní údaje a vztah k danému obsahu,</>,
            <>případné podklady, které pomohou věc ověřit.</>,
          ]}
        />
      </LegalCard>

      <LegalCard title="Zásahy provozovatele">
        <p>
          Vyhrazujeme si právo podezřelý obsah dočasně skrýt nebo trvale odstranit i preventivně,
          pokud existuje důvodné podezření na porušení práv, zákona nebo školních pravidel.
        </p>
        <p>Tato pravidla jsme naposledy aktualizovali dne {legalUpdatedAt}.</p>
      </LegalCard>
    </LegalPageShell>
  );
}

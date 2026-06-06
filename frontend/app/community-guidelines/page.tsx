import type { Metadata } from "next";
import { MessageSquareHeart } from "lucide-react";
import {
  LegalCard,
  LegalLead,
  LegalList,
  LegalPageShell,
  legalUpdatedAt,
} from "@/components/legal/legal-content";

export const metadata: Metadata = {
  title: "Pravidla komunity",
  description:
    "Srozumitelná pravidla komunity pro recenze, komentáře, hodnocení a sdílené materiály na Zvládnu Výšku.",
};

export default function CommunityGuidelinesPage() {
  return (
    <LegalPageShell
      title="Pravidla komunity"
      description="Lidsky napsaná pravidla pro to, co na Zvládnu Výšku patří a co už ne."
      icon={MessageSquareHeart}
    >
      <LegalCard title="Co chceme podporovat">
        <LegalLead>
          Cílem webu je pomoct studentům dělat informovanější rozhodnutí a sdílet užitečné
          zkušenosti, ne vytvářet prostor pro shaming nebo osobní války.
        </LegalLead>
        <LegalList
          items={[
            <>pište konkrétně a věcně, co vám v předmětu, materiálu nebo výuce pomohlo nebo naopak nepomohlo,</>,
            <>kritizujte zkušenost, organizaci výuky nebo kvalitu podkladů, ne identitu člověka,</>,
            <>pokud něco hodnotíte anonymně, chovejte se stejně férově, jako kdybyste to psali veřejně pod svým jménem.</>,
          ]}
        />
      </LegalCard>

      <LegalCard title="Co na web nepatří">
        <LegalList
          items={[
            <>doxxing, zveřejňování osobních údajů nebo snaha identifikovat autora anonymní recenze,</>,
            <>osobní útoky, urážky, pomluvy, zesměšňování nebo šikana,</>,
            <>falešná obvinění, vymyšlené zkušenosti nebo koordinované poškozování konkrétní osoby či předmětu,</>,
            <>hate speech a diskriminační obsah,</>,
            <>reklama, spam, referral odkazy a jiné formy parazitování na komunitě.</>,
          ]}
        />
      </LegalCard>

      <LegalCard title="Recenze a hodnocení">
        <LegalList
          items={[
            <>recenze by měly popisovat průběh studia, výuku, zadání, náročnost nebo užitečnost materiálů,</>,
            <>nepište útoky na vzhled, soukromý život, zdravotní stav, původ nebo jiné osobní charakteristiky vyučujících či studentů,</>,
            <>pokud uvádíte vážné tvrzení, pište jen to, co jste skutečně zažili nebo co umíte věrohodně doložit.</>,
          ]}
        />
      </LegalCard>

      <LegalCard title="Materiály, kartičky a zkouškové podklady">
        <LegalList
          items={[
            <>sdílejte vlastní poznámky, shrnutí a podklady, které mají pro komunitu reálnou hodnotu,</>,
            <>nenahrávejte placené nebo licencované materiály, pokud k tomu nemáte oprávnění,</>,
            <>nenahrávejte obsah, jehož zveřejnění by porušovalo pravidla školy, důvěrnost zkoušek nebo zákon.</>,
          ]}
        />
      </LegalCard>

      <LegalCard title="Jak budeme zasahovat">
        <p>
          Obsah, který tato pravidla porušuje, můžeme skrýt, zamítnout, upravit nebo smazat.
          Opakované porušování může vést k omezení nebo zablokování účtu.
        </p>
        <p>Pravidla komunity jsme naposledy aktualizovali dne {legalUpdatedAt}.</p>
      </LegalCard>
    </LegalPageShell>
  );
}

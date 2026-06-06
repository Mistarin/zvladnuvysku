import type { Metadata } from "next";
import { Cookie } from "lucide-react";
import {
  LegalCard,
  LegalLead,
  LegalPageShell,
  LegalTable,
  legalUpdatedAt,
} from "@/components/legal/legal-content";

export const metadata: Metadata = {
  title: "Cookies",
  description: "Přehled cookies a místních úložišť používaných webem Zvládnu Výšku.",
};

export default function CookiesPage() {
  return (
    <LegalPageShell
      title="Cookies a technická úložiště"
      description="Přehled toho, jaké cookies a browser storage může Zvládnu Výšku používat při provozu webu."
      icon={Cookie}
    >
      <LegalCard title="Jak s cookies pracujeme">
        <LegalLead>
          Web používá nezbytné cookies pro přihlášení, bezpečnost a stabilní fungování aplikace.
        </LegalLead>
        <p>
          Dále můžeme používat analytické cookies služby Google Analytics pro měření návštěvnosti a
          zlepšování produktu. Tyto analytické nástroje používejte jako volitelné a nasazujte je v
          souladu s pravidly pro souhlas, pokud se na váš provoz vztahují.
        </p>
        <p>
          Vedle cookies používá web i lokální úložiště pro nastavení vzhledu a některé uživatelské
          preference přímo v prohlížeči.
        </p>
      </LegalCard>

      <LegalCard title="Přehled používaných úložišť">
        <LegalTable
          headers={["Název", "Typ", "Účel", "Kategorie", "Doba uchování"]}
          rows={[
            [
              "sb-… auth cookies",
              "Cookie",
              "Udržení přihlášení, práce se session a bezpečné ověření uživatele.",
              "Nezbytné",
              "Po dobu session nebo podle nastavení autentizace.",
            ],
            [
              "needs_display_name",
              "Cookie",
              "Dočasné připomenutí, že má uživatel po přihlášení doplnit veřejné jméno.",
              "Nezbytné / funkční",
              "Krátkodobě do doplnění nebo smazání.",
            ],
            [
              "theme",
              "localStorage",
              "Uložení zvoleného světlého nebo tmavého režimu.",
              "Funkční",
              "Do smazání uživatelem.",
            ],
            [
              "sound_enabled",
              "localStorage",
              "Zapamatování, zda jsou v rozhraní povolené zvuky.",
              "Funkční",
              "Do smazání uživatelem.",
            ],
            [
              "_ga, _ga_*",
              "Cookie",
              "Měření návštěvnosti a základní analytika v Google Analytics.",
              "Analytické",
              "Podle nastavení Google Analytics, typicky do 13 měsíců.",
            ],
          ]}
        />
      </LegalCard>

      <LegalCard title="Jak cookies omezit nebo smazat">
        <p>
          Cookies můžete spravovat přímo ve svém prohlížeči. Smazáním přihlašovacích cookies budete
          odhlášeni. Smazáním lokálního úložiště se resetují některé preference, například zvolený
          motiv vzhledu nebo nastavení zvuku.
        </p>
        <p>
          Pokud používáte blokátory nebo rozšíření pro ochranu soukromí, mohou ovlivnit načtení
          některých prvků nebo měření návštěvnosti.
        </p>
      </LegalCard>

      <LegalCard title="Aktualizace dokumentu">
        <p>Tento přehled cookies jsme naposledy aktualizovali dne {legalUpdatedAt}.</p>
      </LegalCard>
    </LegalPageShell>
  );
}

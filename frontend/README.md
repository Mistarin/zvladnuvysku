# Frontend

Frontend aplikace ZvládnuVýšku postavený na Next.js.

Obsahuje:

- landing page a jednotné vyhledávání
- katalog předmětů
- katalog vyučujících
- katalog materiálů
- sekci kartiček a procvičování
- administrační rozhraní pro schvalování a správu obsahu

Hlavní app entrypoint je v `app/`.

## Nasazení

Frontend je samostatná Next.js aplikace. Produkční nasazení může běžet na Vercelu; databáze, autentizace a úložiště zůstávají v Supabase. Railway ani vlastní backendový server nejsou pro tento projekt potřeba.

### Vercel

Při importu repozitáře nastav ve Vercelu:

- **Root Directory:** `frontend`
- **Framework Preset:** `Next.js`
- **Install Command:** `npm ci`
- **Build Command:** `npm run build`

Do Vercel Environment Variables přidej pro Preview i Production:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_GA_MEASUREMENT_ID
```

`NEXT_PUBLIC_SITE_URL` nastav v produkci na hlavní adresu webu, například `https://zvladnuvysku.cz`. Hodnota `NEXT_PUBLIC_VERCEL_URL` slouží jako fallback pro preview deploymenty.

Po vytvoření Vercel projektu nastav v Supabase Dashboard  Authentication  URL Configuration:

- **Site URL:** produkční adresa webu
- **Redirect URLs:** `http://localhost:3000/**`, produkční adresa s `/**` a preview vzor pro Vercel, například `https://*-team-slug.vercel.app/**`

Bez těchto redirect URL nebude magic-link přihlášení fungovat na nové doméně.

Lokální kontrola:

```bash
npm ci
npm run lint
npm run build
```

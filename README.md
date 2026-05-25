# ZvladnuVysku

Studentský informační hub pro Ostravskou univerzitu. Vyhledávání předmětů, hodnocení, flashcardy — vše v češtině.

## O projektu

ZvladnuVysku pomáhá studentům OU orientovat se v předmětech:
- 🔍 **Vyhledávání předmětů** — rychlé full-text vyhledávání s autocomplete
- 📊 **Hodnocení** — obtížnost, časová náročnost, docházka od reálných studentů
- 🃏 **Flashcardy** — spaced repetition studijní pomůcky
- 🌙 **Dark/Light mode** — protože studenti studují v noci

## Stack

| Vrstva | Technologie |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Databáze | Supabase (PostgreSQL + Auth + Storage) |
| Deployment | Railway (frontend) |
| Vyhledávání | PostgreSQL pg_trgm |

## Vývoj

### Požadavky
- Node.js 20+
- npm 10+
- Supabase CLI (volitelné)

### Spuštění

```bash
# Klonování repozitáře
git clone https://github.com/yourname/zvladnuvysku.cz.git
cd zvladnuvysku.cz

# Instalace závislostí
cd frontend
npm install

# Konfigurace prostředí
cp .env.example .env.local
# Vyplň NEXT_PUBLIC_SUPABASE_URL a NEXT_PUBLIC_SUPABASE_ANON_KEY

# Spuštění vývojového serveru
npm run dev
```

Otevři [http://localhost:3000](http://localhost:3000).

### Supabase migrace

```bash
# Spusť SQL soubory v Supabase SQL editoru v tomto pořadí:
supabase/migrations/001_subjects.sql
supabase/migrations/002_flashcards.sql
supabase/migrations/003_ratings.sql

# Seed testovací data
supabase/seed.sql
```

## Struktura projektu

```
zvladnuvysku.cz/
├── frontend/        ← Next.js 15 aplikace
├── backend/         ← Spring Boot (fáze 3+, zatím prázdné)
├── supabase/
│   ├── migrations/  ← SQL migrace
│   └── seed.sql     ← Testovací data
└── .github/
    └── workflows/   ← CI/CD
```

## Deployment

Projekt je nasazen na Railway s přímým napojením na GitHub `main` branch.

Environment variables pro Railway:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Roadmap

- **Fáze 1** (aktuální): Vyhledávání + prohlížení předmětů
- **Fáze 2**: Auth + hodnocení předmětů
- **Fáze 3**: Flashcardy (spaced repetition)
- **Fáze 4**: Moderace + Spring Boot backend
- **Fáze 5**: Hodnocení učitelů

## Licence

MIT

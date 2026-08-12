# CLAUDE.md — dash-meal-admin
> Repo autonome, extrait du monorepo Dash Meal le 2026-08-12. Lire avant de toucher au code.

## Contexte de la migration

Ce repo était `apps/admin` dans un monorepo Turbo/pnpm. Il a été extrait en repo indépendant, déployé sur **Vercel** (domaine `dash-meal.com` / `www.dash-meal.com`), et communique avec le backend **exclusivement via API HTTP** — il n'a plus de code partagé avec lui.

- Ce repo ne dépendait déjà d'aucun type/schéma de l'ancien `packages/shared` dans son code (vérifié avant le split) — rien n'a eu besoin d'être fusionné ici.
- Sibling repos (pas de code partagé, communication API uniquement) :
  - https://github.com/Ing-Valdes-GL/dash-meal-backend (Express, déployé sur Render — `https://dashmeal-3ix5.onrender.com/api/v1`)
  - https://github.com/Ing-Valdes-GL/dash-meal-mobile (Expo, build via EAS)
- **Historique Git non conservé** lors du split — ce repo démarre à son propre commit initial.
- Ancienne convention de branches `service/backend|admin|mobile|shared` du monorepo **ne s'applique plus ici** : ce repo pousse directement sur `main`.

## Commandes

```bash
pnpm install
pnpm dev          # next dev --port 3000
pnpm build        # next build
pnpm start        # next start
pnpm lint         # next lint
pnpm typecheck    # tsc --noEmit
```

Pas de Turbo, pas de `--filter` : ce repo est autonome.

## Architecture

**Route structure** : `src/app/[locale]/(auth)/`, `src/app/[locale]/(dashboard)/`, `src/app/[locale]/(branch)/`, `src/app/[locale]/driver/`, `src/app/[locale]/superadmin/`.

**i18n** : `next-intl`, `fr` (défaut) et `en` — `messages/fr.json` / `messages/en.json`. Toujours `useTranslations()`, jamais de texte FR/EN en dur.

**Auth** : Zustand (`src/stores/auth.ts`), persisté `dash-meal-auth`. Tokens en cookies : `dm_access_token` (15min), `dm_refresh_token` (30j). Axios (`src/lib/api.ts`) injecte le Bearer et gère le refresh+retry sur 401.

**API calls** : helpers typés `apiGet<T>`, `apiPost<T>`, `apiPatch<T>`, `apiDelete<T>` (`src/lib/api.ts`) — retournent `response.data` déjà déballé de `{ success: true; data: T }`. Il existe aussi `src/lib/branch-api.ts` (auth branch séparée) avec le même pattern.

**State** : TanStack React Query pour le serveur, Zustand seulement pour l'auth.

**UI** : Radix UI dans `src/components/ui/`. Brand orange `#f97316`, palette dark `surface.*`. Toujours `cn()` de `src/lib/utils.ts`.

**Path alias** : `@/*` → `src/*`.

## Backend

**URL de production** : `https://dashmeal-3ix5.onrender.com/api/v1` (variable `NEXT_PUBLIC_API_URL`, fallback codé en dur dans `src/lib/api.ts`, `src/lib/branch-api.ts` et la page de login branch si la variable n'est pas définie). Si l'URL Render change (redéploiement, renommage du service), mettre à jour ces 3 fallbacks + la variable d'env Vercel.

## Conventions clés

- Isolation des rôles : jamais exposer de données superadmin aux routes `admin` classiques.
- Isolation par marque : ne jamais afficher de données cross-brand.
- Devise CEMAC (XAF) — `formatCurrency()` de `src/lib/utils.ts`.
- PWA : `@ducanh2912/next-pwa` + manifest + driver web app.

## Variables d'environnement locales

`.env.local` (gitignoré) — voir `.env.local.example` : `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GOOGLE_MAPS_KEY`.

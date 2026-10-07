# AlloLokal

**A two-sided marketplace for home services**: clients find local professionals, book them, pay online, chat and leave reviews. Responsive web app plus a native Android app. Status: **closed beta**, deployed at [allolokal.com](https://allolokal.com).

Engineering by **Cyril Rabineau**, from data model to UI.

## Highlights

- **Payments with Stripe Connect** (Express accounts, platform commission, payouts to providers). Amounts are always recalculated server-side and never trusted from the client; webhooks are signature-verified and processed idempotently. See [`supabase/functions/stripe-webhooks`](supabase/functions/stripe-webhooks) and [ADR 0001](docs/adr/0001-stripe-connect.md).
- **Security in the database**: access rules enforced by PostgreSQL Row Level Security policies, secrets only in Edge Functions, never in the front end. See [`docs/DATABASE.md`](docs/DATABASE.md).
- **14 Edge Functions (Deno)** for payments, subscriptions, account deletion, transactional e-mails and push notifications.
- **Performance**: main bundle cut from 863 kB to 140 kB by profiling the build and splitting per route.
- **GDPR**: EU hosting, right to erasure (`delete-account`), consent management.
- **i18n** in 4 languages (fr, en, de, hr) and an **Android** build with Capacitor.
- **Documented decisions**: architecture, database, API contracts and ADRs in [`docs/`](docs/).

**Stack:** React 19 · TypeScript · Vite · Tailwind · Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions) · Stripe Connect · Google Maps / Places · Resend · Capacitor

> Source code published for portfolio purposes. All rights reserved: no licence is granted to reuse it.

---

*Documentation technique (en français) ci-dessous.*


Marketplace de services à domicile mettant en relation des **clients** et des **professionnels** locaux : recherche géolocalisée, prise de rendez-vous, paiement sécurisé avec commission de plateforme (Stripe Connect), messagerie, avis, et gestion des litiges. Application web responsive **et** application Android native (via Capacitor).

> Nom du package interne : `pikobelo`. Nom produit : **AlloLokal**.

---

## Sommaire

- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Variables d'environnement](#variables-denvironnement)
- [Commandes](#commandes)
- [Structure du projet](#structure-du-projet)
- [Documentation](#documentation)

---

## Stack technique

| Domaine            | Technologie                                                        |
| ------------------ | ------------------------------------------------------------------ |
| Front-end          | React 19, TypeScript, Vite 8                                        |
| Styling            | Tailwind CSS 4, framer-motion                                      |
| Routing            | react-router-dom 7 (lazy loading + code splitting)                 |
| i18n               | i18next / react-i18next (fr, en, de, hr)                           |
| Backend (BaaS)     | Supabase — PostgreSQL, Auth, Row Level Security, Realtime, Storage |
| Fonctions serveur  | Supabase Edge Functions (Deno)                                     |
| Paiements          | Stripe Connect (Express) + Payment Intents                         |
| Cartographie       | Google Maps JavaScript API + Places API (New)                      |
| E-mails            | Resend                                                             |
| Mobile             | Capacitor 8 (Android) + Push Notifications (FCM)                   |

---

## Prérequis

- **Node.js** ≥ 20 et **npm**
- Un projet **Supabase** (base + Edge Functions)
- Un compte **Stripe** (mode test pour le développement)
- Une clé **Google Maps** (Maps JavaScript API + Places API New activées)
- Pour le build Android : **Android Studio** + JDK (voir [Capacitor](https://capacitorjs.com/docs/android))

---

## Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
cp .env.example .env.local
# puis éditez .env.local avec vos clés (voir section ci-dessous)

# 3. Lancer le serveur de développement
npm run dev
```

L'application démarre sur `http://localhost:5173` (port Vite par défaut).

---

## Variables d'environnement

Toutes les variables sont documentées dans [`.env.example`](.env.example). Résumé :

| Variable                      | Rôle                                            | Exposée au client |
| ----------------------------- | ----------------------------------------------- | :---------------: |
| `VITE_SUPABASE_URL`           | URL du projet Supabase                          |        ✅         |
| `VITE_SUPABASE_ANON_KEY`      | Clé publique Supabase (anon)                    |        ✅         |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Clé publiable Stripe                            |        ✅         |
| `VITE_GOOGLE_MAPS_API_KEY`    | Clé Google Maps / Places                        |        ✅         |
| `VITE_ADMIN_SLUG`             | Segment d'URL secret du back-office             |        ✅         |

> ⚠️ Les **secrets** (clé secrète Stripe, service role key, clé Resend, FCM…) ne vivent **jamais** dans le front. Ils se configurent comme secrets d'Edge Functions Supabase. Voir [`docs/API.md`](docs/API.md).

---

## Commandes

| Commande                | Description                                                        |
| ----------------------- | ----------------------------------------------------------------- |
| `npm run dev`           | Serveur de développement (HMR)                                    |
| `npm run build`         | Build de production (`tsc -b` + `vite build`) → `dist/`           |
| `npm run preview`       | Prévisualise le build de production localement                    |
| `npm run lint`          | Analyse ESLint                                                     |
| `npm run analyze`       | Build + visualiseur de bundle (`stats.html`)                      |
| `npm run android`       | Build + sync Capacitor + ouvre Android Studio                     |
| `npm run android:sync`  | Build + sync Capacitor (sans ouvrir Android Studio)               |

### Edge Functions (Supabase CLI)

```bash
# Déployer une fonction
supabase functions deploy create-payment-intent

# Définir un secret
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
```

---

## Structure du projet

```
projet/
├─ src/
│  ├─ pages/           # Pages routées (Home, FindPro, Dashboard, admin/, …)
│  ├─ components/      # Composants réutilisables (booking/, dashboard/, ui/)
│  ├─ contexts/        # Contexts React (ThemeContext)
│  ├─ hooks/           # Hooks (useIsNative, useUnreadMessages, …)
│  ├─ lib/             # Clients & utilitaires (supabase, stripe, disputes, …)
│  ├─ locales/         # Traductions i18n (fr, en, de, hr)
│  ├─ App.tsx          # Routing + gestion de session
│  └─ main.tsx         # Point d'entrée
├─ supabase/
│  ├─ functions/       # Edge Functions Deno (paiement, e-mails, push, …)
│  ├─ migrations/      # Migrations SQL (schéma, RLS, fonctions Postgres)
│  └─ config.toml      # Configuration Supabase locale
├─ public/             # Assets statiques
├─ android/            # Projet Android (Capacitor)
└─ docs/               # Documentation technique (voir ci-dessous)
```

---

## Documentation

| Document                                     | Contenu                                            |
| -------------------------------------------- | -------------------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Vue d'ensemble, flux client↔Supabase↔Stripe        |
| [docs/DATABASE.md](docs/DATABASE.md)         | Schéma PostgreSQL, relations, politiques RLS        |
| [docs/API.md](docs/API.md)                   | Contrat des Edge Functions                          |
| [docs/adr/](docs/adr/)                       | Décisions d'architecture (ADR)                     |
| [CONTRIBUTING.md](CONTRIBUTING.md)           | Conventions de code, workflow git                   |
| [CHANGELOG.md](CHANGELOG.md)                 | Historique des versions                             |
| [SECURITY.md](SECURITY.md)                   | Sécurité & signalement de vulnérabilités            |

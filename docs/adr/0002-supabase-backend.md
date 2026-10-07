# 0002 — Supabase (BaaS) + RLS comme backend

- **Statut** : Accepté
- **Date** : 2026-07-25
- **Décideurs** : Cyril

## Contexte

Le projet, porté par un développeur solo, a besoin d'un backend complet — base de données relationnelle, authentification, temps réel, stockage de fichiers — sans investir dans la construction et l'exploitation d'une API maison. La priorité est le **time-to-market** tout en gardant un modèle de données relationnel solide (marketplace : profils, services, réservations, avis, messagerie).

## Options envisagées

1. **Supabase** — PostgreSQL managé + Auth + Realtime + Storage + Edge Functions, avec autorisation par **Row Level Security** directement dans la base.
2. **API maison** (Node/Express + Postgres) — contrôle total, mais tout est à construire et à maintenir (auth, permissions, temps réel, déploiement).
3. **Firebase** — rapide à démarrer, mais base NoSQL peu adaptée à un modèle fortement relationnel et à des requêtes de type recherche/jointures.

## Décision

Adoption de **Supabase**, avec **RLS comme couche d'autorisation principale**. Le front utilise `supabase-js` avec la clé `anon` ; la sécurité vit dans les policies SQL. La logique privilégiée ou secrète passe par des **Edge Functions** (`service_role`).

## Conséquences

- **Positives** :
  - Backend opérationnel quasi immédiatement (Auth, Realtime, Storage inclus).
  - Modèle relationnel PostgreSQL complet (RPC, triggers, index).
  - Sécurité centralisée dans la base : le front ne peut pas contourner les règles.
- **Négatives / compromis** :
  - Verrouillage fournisseur (portabilité limitée, quotas selon le plan).
  - La logique métier est répartie entre policies SQL, Edge Functions et front — demande de la rigueur documentaire (d'où [DATABASE.md](../DATABASE.md) et [API.md](../API.md)).
  - Les premières tables ont été créées hors migrations versionnées ; un `supabase db pull` reste à faire pour une source de vérité complète.
- **Suivi** :
  - Versionner l'intégralité du schéma via migrations.
  - Auditer régulièrement les policies RLS à chaque nouvelle table.

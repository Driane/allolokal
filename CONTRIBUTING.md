# Contribuer à AlloLokal

Merci de contribuer ! Ce guide décrit les conventions du projet pour garder une base de code cohérente et maintenable.

---

## Mise en route

Voir le [README](README.md) pour l'installation. En résumé :

```bash
npm install
cp .env.example .env.local   # puis renseigner les clés
npm run dev
```

---

## Workflow Git

Le projet suit un modèle **branche de fonctionnalité → `main`**.

1. Créez une branche depuis `main` :
   ```bash
   git checkout -b feat/nom-court-de-la-fonctionnalite
   ```
2. Committez par petites étapes cohérentes (voir convention ci-dessous).
3. Avant de pousser, lancez la checklist qualité.
4. Ouvrez une Pull Request vers `main` avec une description claire (quoi + pourquoi).

**Préfixes de branche** : `feat/`, `fix/`, `refactor/`, `docs/`, `chore/`.

> `main` est la branche de production. Ne poussez jamais de secrets ni de fichier `*.local`.

---

## Convention de messages de commit

Le dépôt utilise des messages en **français**, préfixés par un type suivi de ` : `. Types observés dans l'historique :

| Préfixe      | Usage                                          | Exemple                                                   |
| ------------ | ---------------------------------------------- | --------------------------------------------------------- |
| `Feat :`     | Nouvelle fonctionnalité                        | `Feat : flux abonnement Stripe + code splitting bundle`   |
| `Fix :`      | Correction de bug                              | `Fix : retire import CATEGORY_COLORS inutilisé`           |
| `Refactor :` | Refactorisation sans changement fonctionnel    | `Refactor : centralise les couleurs de catégories`        |
| `Docs :`     | Documentation                                  | `Docs : ajoute ARCHITECTURE.md`                           |
| `Chore :`    | Outillage, config, dépendances                 | `Chore : bump vite 8`                                     |

Règles :
- **Impératif présent**, concis, en français.
- Une portée peut être précisée : `Fix FindPro mobile : …`.
- Le sujet décrit le **quoi** ; ajoutez un corps pour le **pourquoi** si non évident.

---

## Style de code

### TypeScript / React
- **TypeScript strict**, composants **fonctionnels** + hooks (React 19).
- Nommage : `PascalCase` pour les composants et fichiers de composants, `camelCase` pour les variables/fonctions, `useXxx` pour les hooks.
- **Lazy loading** des pages routées (voir `src/App.tsx`) — toute nouvelle page lourde doit être `React.lazy`.
- Respectez les **règles des hooks** (`eslint-plugin-react-hooks`) : dépendances exhaustives, pas d'appel conditionnel.
- Pas de logique de paiement/secret côté client : cela va dans une **Edge Function**.

### Styling
- **Tailwind CSS 4**. Utilisez les variables CSS de thème (`var(--color-...)`) plutôt que des couleurs en dur, pour préserver le mode clair/sombre.

### i18n
- Toute chaîne visible passe par i18next. Ajoutez la clé dans **les 4 locales** : `src/locales/{fr,en,de,hr}.json`.

---

## Checklist avant Pull Request

```bash
npm run lint     # 0 erreur ESLint
npm run build    # tsc -b + build vite OK
```

- [ ] `npm run lint` et `npm run build` passent
- [ ] Nouvelles chaînes traduites dans les 4 locales
- [ ] Aucun secret / `.env.local` committé
- [ ] Migration SQL ajoutée dans `supabase/migrations/` si le schéma change
- [ ] Documentation mise à jour si nécessaire (`docs/`, README)
- [ ] Testé en responsive **et** en contexte natif (`?native=1` force l'UI mobile)

---

## Base de données & Edge Functions

- Tout changement de schéma → un fichier dans `supabase/migrations/` (nom descriptif, idempotent avec `IF NOT EXISTS`).
- Toute table applicative doit avoir **RLS activée** et des policies explicites.
- Déploiement des fonctions : `supabase functions deploy <nom>`. Ne committez jamais de secret ; utilisez `supabase secrets set`.

---

## Signaler un bug / une faille

- Bug fonctionnel : ouvrez une issue avec étapes de reproduction.
- Vulnérabilité de sécurité : suivez [SECURITY.md](SECURITY.md) (ne pas ouvrir d'issue publique).

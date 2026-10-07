# Changelog

Toutes les évolutions notables de ce projet sont consignées dans ce fichier.

Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et le projet suit un versionnage `0.x` (`package.json` : version actuelle **0.0.22**).

> Les versions ci-dessous regroupent thématiquement l'historique Git (les commits
> ne sont pas encore tagués). À partir de maintenant, taguez chaque release
> (`git tag v0.0.x`) pour aligner ce fichier sur les tags.

## [Non publié]

### À venir / en cours
- Interface admin pour consulter les signalements (`user_reports`).
- Séquestre Stripe, gestion de litiges avancée et facturation (voir feuille de route produit).
- Nettoyage des noms de fonctions dans `supabase/config.toml` (`create-connected-account`).

---

## [0.0.22]

### Ajouté
- Flux d'**abonnement pro Stripe** (paliers `essential` / `flex` / `plus`).
- **Code splitting** du bundle via lazy loading des routes (863 kB → ~140 kB de bundle initial).
- Onglet **Planning** dans le profil pro.
- Composant `HScroll` (fade + chevrons sur les zones à scroll horizontal).
- **Autocomplétion Google Places** sur le champ ville de la recherche.
- Tri et affichage des pros **par distance** (haversine).

### Modifié
- Centralisation des **couleurs de catégories** dans `src/lib/categoryColors.ts`.
- Remplacement de **Leaflet/OSM par Google Maps** avec quotas côté client.
- Refonte de l'UI **AvailabilityPage** (toggle switch, X inline).

### Corrigé
- Robustesse du **démarrage de l'app** : `catch` + timeout 5 s sur `getSession`.
- Nombreux correctifs **mobile FindPro** (résultats disparus, chevauchements, scroll vers la carte).
- Correctifs **Places API** (suppression `locationBias` invalide, migration vers Places API New).
- `.htaccess` : cache-control + types MIME + fallback SPA (hébergement Hostinger).

---

## [0.0.x] — Refonte mobile native & conformité

### Ajouté
- **Application Android native** via Capacitor : navigation à onglets (`BottomTabBar`),
  header minimal, bouton retour Android, confirmations Material sur les modales.
- **Notifications push** (FCM) avec bannière d'opt-in contextuelle (pas au lancement).
- **Messagerie** : blocage et signalement d'utilisateur (conformité contenu généré).
- Carte de recherche accessible sur mobile/natif (FAB Material).
- Mode debug `?native=1` pour forcer l'UI mobile native dans un navigateur.

### Corrigé
- 13 bugs remontés par les tests e2e.
- Migration de suspension (`is_suspended` créé avant synchronisation).
- Clés de traduction brutes affichées sur la carte.

---

## Légende des types

- **Ajouté** — nouvelles fonctionnalités.
- **Modifié** — changements de comportement existant.
- **Corrigé** — corrections de bugs.
- **Déprécié** / **Retiré** / **Sécurité** — selon les cas.

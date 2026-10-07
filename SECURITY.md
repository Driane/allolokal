# Politique de sécurité

La sécurité des données de nos utilisateurs (clients et professionnels) est une priorité. AlloLokal traite des données personnelles et des paiements : nous prenons tout signalement au sérieux.

---

## Signaler une vulnérabilité

**N'ouvrez pas d'issue publique** pour une faille de sécurité.

Contactez-nous en privé à : **cyril.rabineau@gmail.com**

Merci d'inclure :
- une description de la vulnérabilité et de son impact potentiel ;
- les étapes de reproduction (ou un PoC) ;
- les URLs / composants concernés ;
- le cas échéant, une suggestion de correctif.

Nous nous efforçons d'accuser réception sous **72 heures** et de vous tenir informé de la résolution. Merci de nous laisser un délai raisonnable pour corriger avant toute divulgation publique (*responsible disclosure*).

---

## Périmètre

Sont concernés : l'application web, l'application Android, les Edge Functions Supabase et la configuration de la base (RLS).

Hors périmètre : les vulnérabilités des services tiers eux-mêmes (Supabase, Stripe, Google, Resend, Firebase) — signalez-les directement à ces fournisseurs.

---

## Mesures de sécurité en place

### Authentification & autorisation
- **Supabase Auth** (JWT, rotation des refresh tokens).
- **Row Level Security (RLS)** activée sur toutes les tables applicatives : le client n'accède qu'aux lignes qui le concernent (voir [docs/DATABASE.md](docs/DATABASE.md)).
- Rôle **admin** porté par `app_metadata.role` dans le JWT (non modifiable côté client) ; le back-office est monté sur un segment d'URL secret **et** protégé par ce rôle.
- Table `consent_logs` en `service-role-only` (aucun accès client).

### Paiements
- Toute la logique Stripe sensible s'exécute dans des **Edge Functions** ; la **clé secrète Stripe ne touche jamais le front**.
- Le webhook Stripe est **vérifié par signature** (`STRIPE_WEBHOOK_SECRET`).
- Le calcul de commission est fait **côté serveur** (non falsifiable par le client).

### Gestion des secrets
- Les variables `VITE_*` du front ne contiennent que des **clés publiques**.
- Les secrets serveur (`STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `FCM_SERVER_KEY`, …) sont stockés comme **secrets d'Edge Functions**, jamais committés.
- Les fichiers `*.local` (dont `.env.local`) sont exclus du dépôt via `.gitignore`.

### Données personnelles (RGPD)
- Journalisation du consentement CGU/CGV à l'inscription (`consent_logs`).
- Fonction de **suppression de compte** (`delete-account`) pour le droit à l'effacement.
- Modération du contenu utilisateur : blocage (`blocked_users`) et signalement (`user_reports`).

---

## Bonnes pratiques pour les contributeurs

- Ne committez jamais de secret, de clé ou de fichier `*.local`.
- Toute nouvelle table doit avoir **RLS activée** avec des policies explicites.
- Toute logique manipulant un secret ou nécessitant des privilèges élevés va dans une **Edge Function**, pas dans le client.
- Restreignez les clés d'API tierces (Google Maps par domaine, Stripe par mode test/live).

> ⚠️ **Recommandation d'audit** : si des clés réelles ont pu se retrouver dans un fichier committé par le passé, faites-les **tourner** (rotation) côté Supabase, Stripe et Google par précaution.

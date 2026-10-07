# API — Edge Functions

AlloLokal n'expose pas d'API REST maison : le CRUD passe directement par **supabase-js** (protégé par RLS, voir [DATABASE.md](DATABASE.md)). La logique serveur sensible vit dans des **Edge Functions Deno** (`supabase/functions/`), appelées depuis le front via `supabase.functions.invoke()` ou déclenchées par webhook/cron.

## Conventions communes

- **Base URL** : `https://<project-ref>.functions.supabase.co/<nom-fonction>`
- **CORS** : `Access-Control-Allow-Origin: *`, gestion du preflight `OPTIONS`.
- **Auth** : la plupart exigent l'en-tête `Authorization: Bearer <jwt>` (`verify_jwt = true` dans `config.toml`). `stripe-webhooks` fait exception (vérifié par signature Stripe).
- **Réponses** : JSON. Succès `200` ; erreur `4xx/5xx` avec `{ "error": "<message>" }`.

## Secrets requis

Configurés via `supabase secrets set NOM=valeur` (jamais dans le front) :

| Secret                      | Utilisé par                                              |
| --------------------------- | ------------------------------------------------------- |
| `STRIPE_SECRET_KEY`         | paiements, Connect, abonnements, webhooks               |
| `STRIPE_WEBHOOK_SECRET`     | `stripe-webhooks` (vérification de signature)           |
| `SUPABASE_SERVICE_ROLE_KEY` | toutes les fonctions à privilèges (contourne RLS)       |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | injectés automatiquement par Supabase          |
| `RESEND_API_KEY`            | e-mails transactionnels                                 |
| `FROM_EMAIL`, `APP_URL`     | templates e-mail, liens et retours                      |
| `FCM_SERVER_KEY`            | `send-push` (notifications Android)                     |

---

## Paiements & Stripe Connect

### `create-payment-intent`
Crée un Payment Intent pour régler une prestation, avec commission de plateforme prélevée sur le compte Connect du pro.

- **Requête** : `{ serviceId: uuid, duration: number /* heures, services horaires */, addonIds: uuid[] }` — JWT requis (`Authorization: Bearer`)
- **Sécurité** : le client est l'utilisateur du JWT ; le pro, le prix du service et celui des options sont relus en base. Le montant n'est **jamais** fourni par le front : il est recalculé côté serveur (`price × durée` si service horaire, + options).
- **Logique** : lit `stripe_connect_id` du pro ; commission **14 %** (première prestation) ou **9 %** (client récurrent = ≥ 1 booking `completed` avec ce pro) ; + **25 %** de taxe sur la commission ; `transfer_data.destination` = pro, `application_fee_amount` = commission totale.
- **Réponse** : `{ clientSecret, paymentIntentId, amount /* centimes */, details: { rate, isRepeated, totalFee } }`

### `create-connected-account`
Crée le compte **Stripe Connect Express** d'un pro (pays `HR`) et renvoie le lien d'onboarding.

- **Requête** : `{ user: { email }, appUrl?: string }`
- **Réponse** : `{ url /* lien onboarding Stripe */, accountId }`
- `refresh_url` → `/onboarding`, `return_url` → `/dashboard`.

> ⚠️ `config.toml` référence cette fonction sous des noms mal orthographiés (`creat-connnected-account`, `create-connnected-account`). Le dossier réel est `create-connected-account` — à corriger.

### `create-subscription-payment-intent`
Crée un Payment Intent pour un abonnement pro. Montants **codés en dur** : `flex` = 3900 (39 €), `plus` = 5900 (59 €).

- **Auth** : `Bearer <jwt>` obligatoire (récupère `user.id`).
- **Requête** : `{ tier: 'flex' | 'plus' }`
- **Réponse** : `{ clientSecret, paymentIntentId }` (metadata `{ userId, tier }`).

### `update-subscription`
Met à jour `profiles.subscription_tier` après paiement d'abonnement confirmé.

### `stripe-webhooks`
Endpoint webhook Stripe (vérifié par `STRIPE_WEBHOOK_SECRET`). Événements gérés :
- `account.updated` → si `details_submitted && charges_enabled`, passe `onboarding_complete = true`.
- `payment_intent.succeeded` → filet de sécurité : applique `subscription_tier` depuis les metadata si le client s'est déconnecté avant `update-subscription`.

---

## Comptes & inscription

### `finalize-signup`
Finalise l'inscription (post-création du compte auth) — création/complétion du profil côté `service_role`.

### `delete-account`
Suppression de compte (droit RGPD). Vérifie le JWT de l'appelant puis supprime via `service_role`.

---

## E-mails (Resend)

Fonctions d'envoi transactionnel. Helpers partagés dans `supabase/functions/_shared/` (`resend.ts`, `templates.ts`, `i18n.ts`).

| Fonction               | Déclencheur / rôle                                          |
| ---------------------- | ---------------------------------------------------------- |
| `send-welcome`         | E-mail de bienvenue à l'inscription                        |
| `send-booking-emails`  | Confirmation de réservation (client + pro)                 |
| `send-status-emails`   | Changement de statut d'une réservation                     |
| `send-dispute-emails`  | Notifications d'ouverture / résolution de litige           |
| `send-review-requests` | Demande d'avis après une prestation                        |
| `send-monthly-recap`   | Récapitulatif mensuel (cron)                               |

---

## Notifications push

### `send-push`
Envoie une notification via **Firebase Cloud Messaging** (`FCM_SERVER_KEY`) aux `push_tokens` du destinataire.

---

## Déploiement

```bash
# Déployer une fonction
supabase functions deploy create-payment-intent

# Définir un secret
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx

# Logs en direct
supabase functions logs create-payment-intent
```

Les fonctions déclenchées par planification (`send-monthly-recap`, `send-review-requests`) sont câblées via **Supabase Scheduled Functions / cron** (à configurer dans le dashboard).

# 0001 — Stripe Connect pour les paiements marketplace

- **Statut** : Accepté
- **Date** : 2026-07-25
- **Décideurs** : Cyril

## Contexte

AlloLokal est une marketplace : un **client** paie une prestation, une **partie** revient au **professionnel** et une **commission** revient à la plateforme. Cela impose :

- d'encaisser le paiement du client ;
- de reverser au pro sa part, en gérant sa conformité (KYC, coordonnées bancaires) ;
- de prélever automatiquement une commission de plateforme (variable : 14 % première prestation, 9 % client récurrent, + taxe) ;
- de ne **jamais** manipuler de secret de paiement côté client ;
- un time-to-market court, sans devenir nous-mêmes un établissement de paiement.

Le marché initial est la **Croatie** (comptes pros en `HR`, devise EUR).

## Options envisagées

1. **Stripe Connect (Express)** — Stripe gère le KYC des pros via un onboarding hébergé, les versements, et le prélèvement de commission via `application_fee_amount` + `transfer_data.destination`. Intégration front (`@stripe/react-stripe-js`) + Edge Functions.
2. **Séquestre / escrow maison** — encaisser sur un compte plateforme puis reverser manuellement. Maîtrise totale, mais complexité réglementaire (statut d'établissement de paiement), risque de conformité et charge opérationnelle élevés.
3. **Autre PSP marketplace** (Mangopay, Lemonway…) — adaptés au split payment mais intégration plus lourde et moins de familiarité que Stripe.

## Décision

Adoption de **Stripe Connect (comptes Express)**.

- Chaque pro possède un `stripe_connect_id` (`profiles`).
- Le paiement client est créé côté serveur (`create-payment-intent`) avec `transfer_data.destination` = pro et `application_fee_amount` = commission calculée **côté serveur**.
- L'onboarding pro passe par un `accountLink` Stripe hébergé (`create-connected-account`).
- Le webhook `account.updated` marque `onboarding_complete` quand `charges_enabled`.

Critère décisif : Stripe **externalise le KYC et les versements** aux pros et gère nativement le split de commission, ce qui évite le statut d'établissement de paiement et raccourcit fortement le développement.

## Conséquences

- **Positives** :
  - Pas de manipulation de coordonnées bancaires ni de KYC en interne.
  - Commission prélevée automatiquement et de façon fiable (calcul serveur non falsifiable).
  - Secrets de paiement isolés dans les Edge Functions.
- **Négatives / compromis** :
  - Dépendance forte à Stripe (verrouillage fournisseur).
  - Frais Stripe en sus de la commission plateforme.
  - Le versement immédiat au pro ne fournit pas de vrai **séquestre** jusqu'à la fin de prestation — à revisiter pour la gestion des litiges (voir feuille de route : séquestre + litiges).
- **Suivi** :
  - Centraliser les taux de commission et montants d'abonnement (aujourd'hui codés en dur dans les fonctions).
  - Corriger les noms de fonctions dans `config.toml` (`create-connected-account`).
  - Réévaluer si une logique de séquestre (capture différée / `on_behalf_of`) devient nécessaire.

# Architecture Decision Records (ADR)

Ce dossier consigne les **décisions d'architecture** importantes du projet : le contexte, les options envisagées, la décision et ses conséquences. Objectif : que quiconque rejoint le projet comprenne *pourquoi* les choses sont ainsi, sans avoir à reconstituer l'historique.

## Comment ça marche

- Une décision = un fichier `NNNN-titre-court.md` (numéro incrémental).
- Partez de [`template.md`](template.md).
- Une ADR est **immuable** une fois acceptée : si une décision change, créez une nouvelle ADR qui **remplace** (`Superseded by`) l'ancienne, sans réécrire l'historique.

## Index

| N°                                        | Titre                                   | Statut   |
| ----------------------------------------- | --------------------------------------- | -------- |
| [0001](0001-stripe-connect.md)            | Stripe Connect pour les paiements marketplace | Accepté  |
| [0002](0002-supabase-backend.md)          | Supabase (BaaS) + RLS comme backend     | Accepté  |

# ASSETS-LICENSES.md — AlloLokal

Inventaire des assets du projet soumis à vérification juridique.
Contexte : site commercial opéré en Europe (marché croate). Dernière mise à jour : 2026-07-28.

> **Note préalable** : ce document décrit les constats techniques (métadonnées, dimensions,
> indices de provenance). Il ne constitue pas une certification juridique. Chaque asset
> marqué ⚠️ VÉRIFIER nécessite une action humaine avant mise en production commerciale.

---

## 1. Polices

| Fichier / Source | Licence | Statut |
|---|---|---|
| Plus Jakarta Sans (Tokotype) | **SIL OFL 1.1** — libre pour usage commercial, modification, redistribution | ✅ OK |

**Mode de chargement :** auto-hébergée via `@fontsource-variable/plus-jakarta-sans` (npm).
Importée dans `src/main.tsx`. Aucun appel vers `fonts.googleapis.com` ou `fonts.gstatic.com`
ne subsiste dans le projet — conformité RGPD assurée.

Correction appliquée le 2026-07-28 : suppression de l'`@import url('https://fonts.googleapis.com/...')`
de `src/index.css` (jurisprudence LG München I, 20 janvier 2022 — 3 O 17493/20).

---

## 2. Photos — public/categories/

> Indices de provenance : les images mesurant 612px de large correspondent à la largeur
> standard de téléchargement Shutterstock (plan Web). Les descriptions EXIF sont des
> légendes typiques de banques d'images. **Ces images ne peuvent pas être utilisées
> commercialement sans licence vérifiée.**

| Fichier | Dimensions | EXIF ImageDescription | EXIF Copyright | Source identifiable | Statut |
|---|---|---|---|---|---|
| `public/categories/beauty.jpg` | 612 × 408 px | "Happy beautiful young adult woman showing her perfect face with healthy shiny skin. Beauty photo…" | Aucune | 612px + légende banque d'images → probable Shutterstock / Adobe Stock | ⚠️ **VÉRIFIER** |
| `public/categories/cleaning.jpg` | 612 × 408 px | "Making my floors sparkle" | Aucune | 612px + légende banque d'images → probable Shutterstock / Adobe Stock | ⚠️ **VÉRIFIER** |
| `public/categories/home.jpg` | 612 × 407 px | "An Asian young Technician service man wearing blue uniform checking, cleaning air conditioner in home" | Aucune | 612px + légende banque d'images → probable Shutterstock / Adobe Stock | ⚠️ **VÉRIFIER** |
| `public/categories/wellbeing.jpg` | 612 × 408 px | "Close-up of a man getting massage" | Aucune | 612px + légende banque d'images → probable Shutterstock / Adobe Stock | ⚠️ **VÉRIFIER** |
| `public/categories/family.jpg` | 539 × 360 px | *(aucune)* | Aucune | EXIF strippées — source inconnue | ⚠️ **VÉRIFIER** |
| `public/categories/premium.jpg` | 540 × 360 px | *(aucune)* | Aucune | EXIF strippées — source inconnue | ⚠️ **VÉRIFIER** |

### Actions requises pour les photos

Pour chaque image ⚠️ :

1. **Retrouver la facture / l'ordre de téléchargement** sur le compte Shutterstock, Adobe Stock,
   Getty Images ou autre banque utilisée. La licence doit couvrir l'usage *commercial* et
   l'affichage sur un site web (ne pas confondre avec la licence "éditoriale" ou "essai gratuit").

2. **Si la source ne peut pas être retrouvée** : remplacer l'image par une alternative
   libre de droits pour usage commercial. Sources recommandées :
   - [Unsplash](https://unsplash.com) (licence Unsplash — usage commercial gratuit)
   - [Pexels](https://pexels.com) (licence Pexels — usage commercial gratuit)
   - [Pixabay](https://pixabay.com) (licence Pixabay Content — usage commercial gratuit)
   - Achat d'une licence sur Shutterstock / Adobe Stock avec conservation de la facture

3. **Conserver les justificatifs** (PDF de licence, numéro d'image, date d'achat) dans
   un dossier `legal/stock-licenses/` du repository privé.

---

## 3. Logo & icônes de marque

| Fichier | Dimensions | Métadonnées techniques | Source | Statut |
|---|---|---|---|---|
| `public/favicon.svg` | 180×180 viewBox | SVG custom, couleur #ea592d, aucun copyright tiers | Logo AlloLokal (créé sur mesure) | ✅ Propriétaire |
| `public/logo.png` | 250 × 213 px | Software: Adobe ImageReady | Logo AlloLokal — export Photoshop | ✅ Propriétaire |
| `public/apple-touch-icon.png` | 180 × 180 px | Software: Adobe ImageReady | Dérivé du logo AlloLokal | ✅ Propriétaire |
| `public/favicon-512.png` | 512 × 512 px | Software: Adobe ImageReady | Dérivé du logo AlloLokal | ✅ Propriétaire |
| `store-assets/appstore-icon-1024.png` | 1024 × 1024 px | Software: Adobe ImageReady | Pack FullSet (juillet 2026) — designer | ✅ Propriétaire* |
| `store-assets/playstore-icon-512.png` | 512 × 512 px | Software: Adobe ImageReady | Pack FullSet (juillet 2026) — designer | ✅ Propriétaire* |
| `store-assets/logo-source-1000x850-transparent.png` | 1000 × 850 px | Software: Adobe ImageReady | Source haute résolution du logo | ✅ Propriétaire* |

*✅ Propriétaire — sous réserve que le contrat avec le designer inclue la cession des droits patrimoniaux.

### Action requise pour le logo

**Vérifier que le contrat avec le designer / agence inclut une cession des droits d'auteur**
(ou une licence exclusive) sur le logo. Sans cession écrite, le designer reste l'auteur au
sens du droit d'auteur européen (directive 2001/29/CE), même si vous avez payé la prestation.

---

## 4. Carte de Croatie — `public/croatia-map.jpg` + `public/croatia-map.webp`

| Fichier | Source | Licence | Attribution requise | Statut |
|---|---|---|---|---|
| `public/croatia-map.jpg` (204 KB) | Tuiles OSM standard, zoom 8, x∈[137,141] y∈[90,94] — 25 tuiles, recadrées | **ODbL** (Open Database Licence) | **Oui** : « © OpenStreetMap contributors » avec lien vers openstreetmap.org/copyright | ✅ OK — attribution présente dans le JSX |
| `public/croatia-map.webp` (138 KB) | Dérivé du JPG ci-dessus | Même licence | Même attribution | ✅ OK |

**Paramètres de l'image :**
- Bbox (crop sur la Croatie) : lon 13.0 °E → 19.6 °E ; lat 42.2 °N → 46.6 °N
- Dimensions : 1280 × 1280 px (tuiles brutes) → 900 × 900 px (resize) → **845 × 789 px** (crop final)
- Ratio Mercator W/H = 1.0709 → `aspect-ratio: 845/789` correct, pas de distorsion
- Projection : `x% = (lon − 13.0) / 6.6` ; `y% = (0.921433 − ln(tan(π/4 + lat_rad/2))) / 0.107561`

**Marqueurs de villes :** Zagreb, Split, Rijeka, Zadar, Osijek, Dubrovnik, Pula, Šibenik — positions calculées via projection Web Mercator exacte depuis les lat/lon réelles. Zone cliquable 44×44 px (WCAG 2.5.5). Labels positionnés pour éviter tout chevauchement (right/left/top/bottom par ville).

**Attribution visible :** « © OpenStreetMap contributors » centré sous la carte dans `src/pages/Home.tsx` (obligation ODbL).

---

## 5. SVG utilitaires

| Fichier | Contenu | Statut |
|---|---|---|
| `public/icons.svg` | Sprite SVG d'icônes sociales (Bluesky, potentiellement d'autres) | ⚠️ **VÉRIFIER** — voir ci-dessous |

**Action requise :** identifier la source de chaque icône dans `public/icons.svg` (Lucide,
Simple Icons, Heroicons, etc.) et vérifier la licence. La plupart des bibliothèques d'icônes
sont MIT ou Apache 2.0 (compatibles usage commercial), mais certaines icônes de marques
imposent des restrictions d'usage (ex. les icônes officielles de réseaux sociaux ont parfois
des Brand Guidelines à respecter).

---

## 6. Autres fichiers publics

| Fichier | Nature | Statut |
|---|---|---|
| `public/sitemap.xml` | Généré — contenu du site | ✅ Propriétaire |
| `public/robots.txt` | Directive crawler | ✅ Propriétaire |
| `public/.htaccess` | Config serveur Apache | ✅ Propriétaire |

---

## 7. Récapitulatif des actions

| Priorité | Action | Délai suggéré |
|---|---|---|
| 🔴 Critique | Retrouver / remplacer les 6 photos `public/categories/` | Avant mise en production |
| 🟡 Important | Vérifier le contrat de cession de droits du designer (logo) | Avant mise en production |
| 🟡 Important | Vérifier la licence des icônes dans `public/icons.svg` | Avant mise en production |
| ✅ Fait | Migrer la police Plus Jakarta Sans vers auto-hébergement | Fait le 2026-07-28 |
| ✅ Fait | Remplacer le contour SVG par carte OSM réelle (image JPG/WebP + marqueurs HTML) | Fait le 2026-07-28 |

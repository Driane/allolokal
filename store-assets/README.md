# Store assets — AlloLokal

Icônes officielles pour les fiches store, issues du pack FullSet (juillet 2026).
Specs vérifiées le 13/07/2026.

| Fichier | Usage | Specs exigées | Vérifié |
|---|---|---|---|
| `appstore-icon-1024.png` | App Store Connect → App Icon | 1024×1024, PNG, **sans transparence** | ✅ 1024×1024, alpha=non, 42 Ko |
| `playstore-icon-512.png` | Play Console → Icône de l'application | 512×512, PNG 32 bits, ≤ 1 Mo | ✅ 512×512, 18,7 Ko |
| `logo-source-1000x850-transparent.png` | Source haute résolution (transparent) | — | pour usages futurs |

## Icônes de lancement Android/iOS (dans l'app)

Les icônes ci-dessus sont pour les **fiches store**. Pour régénérer les icônes de
lancement de l'app Capacitor (mipmap Android / AppIcon iOS) à partir de la 1024 :

```
npm install -D @capacitor/assets
# placer store-assets/appstore-icon-1024.png dans assets/icon.png puis :
npx capacitor-assets generate --android --ios
```

## Manque encore (à demander au designer)

- **og-image 1200×630** (JPEG/PNG opaque) — référencée par le site (`SEO.tsx` → `/og-image.jpg`) mais absente. Utilisée pour les partages réseaux sociaux/WhatsApp.
- (optionnel) **icône maskable 512×512** avec marges safe-zone pour PWA Android.

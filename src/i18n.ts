import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import fr from './locales/fr.json';
import en from './locales/en.json';
import de from './locales/de.json';
import hr from './locales/hr.json';

/**
 * Langue par défaut : Croate (public cible principal).
 * Exceptions :
 *   - Appareil en allemand (de-*)  → Allemand
 *   - Appareil en français (fr-*)  → Français
 *   - Appareil en croate  (hr-*)   → Croate
 *   - Tout autre appareil          → Croate (pas anglais)
 *
 * La préférence sauvegardée dans localStorage a toujours la priorité.
 */
function detectInitialLanguage(): string {
  const SUPPORTED = ['hr', 'en', 'de', 'fr'];

  // 1. Préférence précédemment sauvegardée par l'utilisateur
  try {
    const saved = localStorage.getItem('allolokal_lang');
    if (saved && SUPPORTED.includes(saved)) return saved;
  } catch { /* Private browsing ou localStorage bloqué */ }

  // 2. Langue du navigateur / système
  const browserLang = (navigator.language || navigator.languages?.[0] || '').toLowerCase();
  if (browserLang.startsWith('de')) return 'de';
  if (browserLang.startsWith('fr')) return 'fr';
  if (browserLang.startsWith('hr')) return 'hr';

  // 3. Défaut : Croate (MVP centré Croatie)
  return 'hr';
}

const initialLang = detectInitialLanguage();

i18n
  .use(initReactI18next)
  .init({
    lng: initialLang,
    fallbackLng: 'hr',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      de: { translation: de },
      hr: { translation: hr },
    },
    react: {
      useSuspense: false,
    },
  });

// Persister la langue choisie manuellement
i18n.on('languageChanged', (lng) => {
  try { localStorage.setItem('allolokal_lang', lng); } catch { /* silencieux */ }
});

export default i18n;

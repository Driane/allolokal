import type { TFunction } from 'i18next';
import type { i18n as i18nType } from 'i18next';

/** Traduit un slug de catégorie sans jamais afficher la clé brute (ex. "CATEGORIES.ITEMS.X").
 *  Ordre de résolution : clé i18n exacte → namespace sub (pour les items) → slug prettifié. */
export function translateCategorySlug(
  t: TFunction,
  i18n: i18nType,
  slug: string | null | undefined,
  namespace: 'items' | 'sub' | 'main' = 'items',
): string {
  if (!slug) return '';
  const key = `categories.${namespace}.${slug}`;
  if (i18n.exists(key)) return t(key) as string;
  if (namespace === 'items') {
    const subKey = `categories.sub.${slug}`;
    if (i18n.exists(subKey)) return t(subKey) as string;
  }
  return slug.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

/** Couleurs canoniques par catégorie principale — utilisées pour les badges, pastilles et
 *  marqueurs carte. Choisies parmi les teintes Tailwind 500 : lisibles en clair et en sombre
 *  que ce soit en texte coloré ou en fond à faible opacité (pattern `color + 18` hex). */
export const CATEGORY_COLORS: Record<string, string> = {
  beauty:   '#ec4899',  // pink-500
  home:     '#22c55e',  // green-500
  cleaning: '#3b82f6',  // blue-500
  wellbeing:'#a855f7',  // purple-500
  family:   '#f97316',  // orange-500
  premium:  '#eab308',  // yellow-500
};

/** Couleur de repli quand la catégorie est inconnue ou absente. */
export const DEFAULT_CATEGORY_COLOR = '#6366f1';  // indigo-500

/** Catégories valides (pour les filtres et la carte). */
export const VALID_MAIN_CATEGORIES: string[] = [
  'beauty', 'home', 'cleaning', 'wellbeing', 'family', 'premium',
];

/** Retourne la couleur de la catégorie, ou DEFAULT_CATEGORY_COLOR si absente/inconnue. */
export function getCategoryColor(category?: string | null): string {
  return (category && CATEGORY_COLORS[category]) || DEFAULT_CATEGORY_COLOR;
}

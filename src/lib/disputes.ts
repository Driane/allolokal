// Fenêtre d'éligibilité pour ouvrir un litige après une réservation.
// 48h pour les catégories à exécution rapide (beauté, famille, propreté), 7j pour les autres
// (ex: gros travaux maison, où un défaut peut n'être visible que plus tard).
const SHORT_WINDOW_CATEGORIES = ['beauty', 'family', 'cleaning'];

export function getDisputeWindowHours(category?: string | null): number {
  return category && SHORT_WINDOW_CATEGORIES.includes(category) ? 48 : 24 * 7;
}

export function isWithinDisputeWindow(bookingDate: string, category?: string | null): boolean {
  const hoursSince = (Date.now() - new Date(bookingDate).getTime()) / 3600000;
  return hoursSince >= 0 && hoursSince <= getDisputeWindowHours(category);
}

// Motifs prédéfinis — formulaire de litige côté client (cf. demande associée).
// `fr` = valeur canonique stockée en base (admin lit toujours en français) ;
// `key` = clé i18n pour afficher le libellé dans la langue active du site.
export const DISPUTE_REASONS_CLIENT: { groupKey: string; items: { key: string; fr: string }[] }[] = [
  { groupKey: 'pro', items: [
    { key: 'booking_not_validated', fr: 'Réservation non reconnue / non validée par le prestataire' },
    { key: 'no_show',               fr: 'Prestataire absent (no-show)' },
    { key: 'unreachable',           fr: 'Prestataire fermé / injoignable sur place' },
    { key: 'late_cancellation',     fr: 'Annulation tardive par le prestataire' },
  ]},
  { groupKey: 'service', items: [
    { key: 'time_not_respected', fr: 'Horaire de rendez-vous non respecté' },
    { key: 'execution_issue',    fr: "Problème d'exécution du service" },
    { key: 'not_as_described',   fr: 'Service non conforme à la prestation commandée' },
    { key: 'interrupted',        fr: 'Prestation interrompue / inachevée' },
  ]},
  { groupKey: 'billing', items: [
    { key: 'price_mismatch',           fr: 'Tarif facturé différent du prix convenu' },
    { key: 'damage',                   fr: 'Dommage matériel pendant la prestation' },
    { key: 'inappropriate_behavior',   fr: 'Comportement inapproprié du prestataire' },
  ]},
];

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';

// true uniquement quand l'app tourne dans la coquille native (Android/iOS via Capacitor),
// jamais dans un navigateur — le site web n'est donc jamais affecté par les composants
// qui dépendent de ce hook.
// Exception volontaire : ?native=1 force l'affichage natif dans un navigateur, pour
// pouvoir prévisualiser/déboguer l'UI mobile sans build natif. Sans incidence en prod
// (personne n'ajoute ce paramètre par hasard) ni sur le comportement réel de l'app.
export function useIsNative(): boolean {
  const [isNative] = useState(() =>
    Capacitor.isNativePlatform() || new URLSearchParams(window.location.search).get('native') === '1'
  );
  return isNative;
}

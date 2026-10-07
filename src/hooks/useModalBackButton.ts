import { useEffect } from 'react';
import { useIsNative } from './useIsNative';
import { pushBackHandler, popBackHandler } from '../lib/backButtonStack';

// À utiliser dans toute modale/drawer plein écran : tant qu'elle est ouverte, le bouton/geste
// retour Android la ferme au lieu de naviguer vers la page précédente ou de quitter l'app.
export function useModalBackButton(isOpen: boolean, onClose: () => void) {
  const isNative = useIsNative();
  useEffect(() => {
    if (!isNative || !isOpen) return;
    pushBackHandler(onClose);
    return () => popBackHandler(onClose);
  }, [isNative, isOpen, onClose]);
}

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { useIsNative } from './useIsNative';
import { consumeBackButton } from '../lib/backButtonStack';

// Gère le bouton/geste retour matériel Android au niveau global. Priorité :
// 1) une modale/drawer ouverte (via useModalBackButton) la ferme et absorbe l'événement
// 2) sinon, navigue dans l'historique des routes
// 3) sinon (déjà à l'accueil), quitte l'app
export function useAndroidBackButton() {
  const isNative = useIsNative();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isNative) return;
    const subPromise = App.addListener('backButton', () => {
      if (consumeBackButton()) return;
      if (location.pathname === '/') {
        App.exitApp();
      } else {
        navigate(-1);
      }
    });
    return () => { subPromise.then(sub => sub.remove()); };
  }, [isNative, navigate, location.pathname]);
}

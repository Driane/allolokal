import { useSyncExternalStore } from 'react';

// Pile globale des modales/drawers ouverts. Sert à deux choses :
// 1) le bouton retour Android doit fermer la modale la plus récemment ouverte
//    plutôt que de naviguer vers la page précédente (cf. useAndroidBackButton)
// 2) la BottomTabBar doit se masquer tant qu'une modale plein écran est ouverte,
//    sinon elle s'affiche par-dessus (z-index) une partie du contenu de la modale.
type CloseHandler = () => void;
const stack: CloseHandler[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function pushBackHandler(handler: CloseHandler) {
  stack.push(handler);
  notify();
}

export function popBackHandler(handler: CloseHandler) {
  const i = stack.lastIndexOf(handler);
  if (i !== -1) stack.splice(i, 1);
  notify();
}

// Appelé par useAndroidBackButton : true + ferme la modale du dessus si la pile
// n'est pas vide, sinon false (laisse le handler global gérer navigation/sortie).
export function consumeBackButton(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top();
  return true;
}

export function useIsAnyModalOpen(): boolean {
  return useSyncExternalStore(
    onChange => { listeners.add(onChange); return () => listeners.delete(onChange); },
    () => stack.length > 0,
  );
}

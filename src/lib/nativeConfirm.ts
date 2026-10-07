import { useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';

export interface ConfirmRequest {
  message:       string;
  title?:        string;
  confirmLabel?: string;
  cancelLabel?:  string;
  danger?:       boolean;
  resolve:       (ok: boolean) => void;
}

let current: ConfirmRequest | null = null;
const listeners = new Set<() => void>();
function notify() { for (const l of listeners) l(); }

// Sur le web, garde le window.confirm() natif du navigateur (comportement inchangé).
// En app native, affiche un dialogue Material cohérent avec le reste de l'UI.
export function confirmNative(opts: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return Promise.resolve(window.confirm(opts.message));
  }
  return new Promise<boolean>(resolve => {
    current = { ...opts, resolve };
    notify();
  });
}

export function answerConfirm(ok: boolean) {
  current?.resolve(ok);
  current = null;
  notify();
}

export function useConfirmRequest(): ConfirmRequest | null {
  return useSyncExternalStore(
    onChange => { listeners.add(onChange); return () => listeners.delete(onChange); },
    () => current,
  );
}

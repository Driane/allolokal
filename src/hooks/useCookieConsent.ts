import { useState, useCallback } from 'react';

export interface CookieConsent {
  decided:   boolean;
  essential: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
}

const KEY = 'allolokal_cookie_consent';

const defaultConsent: CookieConsent = {
  decided:   false,
  essential: true,
  analytics: false,
  marketing: false,
  timestamp: 0,
};

function load(): CookieConsent {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultConsent;
    return { ...defaultConsent, ...JSON.parse(raw) };
  } catch {
    return defaultConsent;
  }
}

function save(consent: CookieConsent) {
  localStorage.setItem(KEY, JSON.stringify(consent));
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent>(load);

  const acceptAll = useCallback(() => {
    const next: CookieConsent = { decided: true, essential: true, analytics: true, marketing: true, timestamp: Date.now() };
    save(next);
    setConsent(next);
  }, []);

  const rejectAll = useCallback(() => {
    const next: CookieConsent = { decided: true, essential: true, analytics: false, marketing: false, timestamp: Date.now() };
    save(next);
    setConsent(next);
  }, []);

  const saveCustom = useCallback((analytics: boolean, marketing: boolean) => {
    const next: CookieConsent = { decided: true, essential: true, analytics, marketing, timestamp: Date.now() };
    save(next);
    setConsent(next);
  }, []);

  const resetConsent = useCallback(() => {
    localStorage.removeItem(KEY);
    setConsent(defaultConsent);
  }, []);

  return { consent, acceptAll, rejectAll, saveCustom, resetConsent };
}

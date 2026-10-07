import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useIsNative } from '../hooks/useIsNative';
import { activatePushNotifications } from '../lib/pushNotifications';

const DISMISSED_KEY = 'allolokal:push-banner-dismissed';

interface Props { loggedIn: boolean; }

// Demande la permission notifications avec contexte, pas au lancement de l'app
// sans explication (recommandation Android/iOS — cf. prompt de conformité).
const NotificationOptInBanner: React.FC<Props> = ({ loggedIn }) => {
  const isNative = useIsNative();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isNative || !loggedIn) { setVisible(false); return; }
    if (localStorage.getItem(DISMISSED_KEY)) return;

    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const { receive } = await PushNotifications.checkPermissions();
        if (receive === 'prompt') setVisible(true);
      } catch { /* plugin indisponible */ }
    })();
  }, [isNative, loggedIn]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  const activate = async () => {
    await activatePushNotifications();
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mx-4 mt-3 p-4 rounded-2xl bg-[var(--color-accent-light)] border border-[var(--color-accent)]/30 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-[var(--color-accent)] flex items-center justify-center shrink-0">
        <Bell size={16} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-main)] mb-1">
          {t('push.opt_in_title', 'Restez informé')}
        </p>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-3">
          {t('push.opt_in_desc', 'Activez les notifications pour suivre vos réservations et messages en temps réel.')}
        </p>
        <div className="flex gap-2">
          <button
            onClick={activate}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white border-none cursor-pointer"
          >
            {t('push.opt_in_activate', 'Activer')}
          </button>
          <button
            onClick={dismiss}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] bg-transparent border-none cursor-pointer"
          >
            {t('push.opt_in_later', 'Plus tard')}
          </button>
        </div>
      </div>
      <button onClick={dismiss} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] bg-transparent border-none cursor-pointer shrink-0">
        <X size={16} />
      </button>
    </div>
  );
};

export default NotificationOptInBanner;

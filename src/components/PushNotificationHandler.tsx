import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// URL à ouvrir au démarrage si l'app a été lancée via une notification
let pendingUrl: string | null = null;

const PushNotificationHandler: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Naviguer vers l'URL stockée quand le routeur est prêt
    if (pendingUrl) {
      navigate(pendingUrl);
      pendingUrl = null;
    }
  }, [navigate]);

  useEffect(() => {
    const init = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Ne redemande PAS la permission ici — seulement si déjà accordée lors
        // d'une session précédente (via activatePushNotifications), pour garder
        // le token à jour. Sinon, on attend une action explicite de l'utilisateur.
        const { receive } = await PushNotifications.checkPermissions();
        if (receive !== 'granted') return;

        await PushNotifications.register();

        // ── 2. Enregistrer le token FCM dans Supabase ──────────────────────
        await PushNotifications.addListener('registration', async ({ value: token }) => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase.from('push_tokens').upsert(
              { user_id: user.id, token, platform: Capacitor.getPlatform(), updated_at: new Date().toISOString() },
              { onConflict: 'user_id,token' }
            );
          } catch { /* silencieux */ }
        });

        // ── 3. Notification reçue (app ouverte) ─────────────────────────────
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          // On pourrait afficher un toast ici — pour l'instant on ignore
          console.log('[Push] reçue:', notification.title);
        });

        // ── 4. Tap sur une notification (app en arrière-plan ou fermée) ──────
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const url = action.notification.data?.url as string | undefined;
          if (!url) return;

          // Si le composant est déjà monté, naviguer immédiatement
          // Sinon stocker pour naviguer après le montage
          try {
            navigate(url);
          } catch {
            pendingUrl = url;
          }
        });

      } catch { /* non-natif ou plugin indisponible */ }
    };

    init();

    // Nettoyer les listeners au démontage
    return () => {
      import('@capacitor/core').then(({ Capacitor }) => {
        if (!Capacitor.isNativePlatform()) return;
        import('@capacitor/push-notifications').then(({ PushNotifications }) => {
          PushNotifications.removeAllListeners();
        });
      }).catch(() => {});
    };
  }, []); // eslint-disable-line

  // Re-enregistrer le token si l'utilisateur change (connexion / déconnexion)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        // Supprimer les tokens de l'utilisateur à la déconnexion
        try {
          const { Capacitor } = await import('@capacitor/core');
          if (!Capacitor.isNativePlatform()) return;
          const { PushNotifications } = await import('@capacitor/push-notifications');
          const { value: token } = await PushNotifications.getDeliveredNotifications()
            .catch(() => ({ notifications: [] })) as unknown as { value?: string };
          if (token) await supabase.from('push_tokens').delete().eq('token', token);
        } catch { /* silencieux */ }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return null;
};

export default PushNotificationHandler;

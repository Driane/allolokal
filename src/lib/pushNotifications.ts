// N'est PAS appelé automatiquement au démarrage : Android/Google Play et Apple
// déconseillent de demander une permission sans contexte. À déclencher depuis
// une action explicite de l'utilisateur (cf. NotificationOptInBanner).
export async function activatePushNotifications(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return false;
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const { receive } = await PushNotifications.requestPermissions();
    if (receive !== 'granted') return false;
    await PushNotifications.register();
    return true;
  } catch {
    return false;
  }
}

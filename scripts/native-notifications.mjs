import { LocalNotifications } from '@capacitor/local-notifications';

window.MeuAmorLocalNotifications = LocalNotifications;

if (window.Capacitor?.isNativePlatform?.()) {
  LocalNotifications.addListener('localNotificationActionPerformed', ({ notification }) => {
    const targetUrl = notification.extra?.url;
    if (targetUrl) window.location.href = targetUrl;
  }).catch(() => {});
}

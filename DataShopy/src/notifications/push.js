import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from '../supabase/client';

// Show a banner/alert even while the app is in the foreground (the default
// behavior on both platforms is to stay silent while the app is open).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const getProjectId = () =>
  Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || null;

// Requests permission, grabs this device's Expo push token, and saves it on
// the signed-in user's profile so the server can target them later. Safe to
// call on every app start/login — it's a no-op (returns null) on
// simulators/emulators or if permission is denied, and never throws.
export const registerForPushNotificationsAsync = async (userId) => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    if (!Device.isDevice) {
      console.warn('[push] skipping registration: push tokens require a physical device');
      return null;
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') {
      console.warn('[push] permission not granted');
      return null;
    }

    const projectId = getProjectId();
    if (!projectId) {
      console.warn('[push] missing EAS projectId in app config, cannot fetch a push token');
      return null;
    }

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = data || null;
    if (!token || !userId) return token;

    const { error } = await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
    if (error) console.warn('[push] saving push_token to profile failed', error);

    return token;
  } catch (e) {
    console.warn('[push] registerForPushNotificationsAsync failed', e);
    return null;
  }
};

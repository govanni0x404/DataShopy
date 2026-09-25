import { Alert } from 'react-native';
import { isRemoteUser } from '../supabase/favorites';

// A guest has no Supabase account (no UUID id).
export const isGuestUser = (user) => !isRemoteUser(user?.id);

// Sends the guest to the auth screens, from any nested navigator: resets the ROOT stack so
// "back" doesn't return to the guest session and the auth screens keep a sane history.
export const goToAuth = (navigation, screen = 'Login') => {
  let root = navigation;
  while (root?.getParent?.()) root = root.getParent();
  const routes = screen === 'Register' ? [{ name: 'Login' }, { name: 'Register' }] : [{ name: 'Login' }];
  root.reset({ index: routes.length - 1, routes });
};

export const promptGuestSignIn = (navigation, message) => {
  Alert.alert('Necesitas una cuenta', message, [
    { text: 'Ahora no', style: 'cancel' },
    { text: 'Iniciar sesión', onPress: () => goToAuth(navigation, 'Login') },
    { text: 'Crear cuenta', onPress: () => goToAuth(navigation, 'Register') },
  ]);
};

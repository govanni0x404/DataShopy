import { Alert } from 'react-native';
import { supabase } from './client';

// Permanently deletes the signed-in user's account through the `delete-account`
// edge function (it needs the service role), then clears the local session.
// Throws with a user-facing message when the server refuses.
export const deleteMyAccount = async () => {
  const { data, error } = await supabase.functions.invoke('delete-account', { body: {} });
  if (error) throw new Error('No se pudo eliminar la cuenta. Revisa tu conexión e inténtalo de nuevo.');
  if (!data?.success) throw new Error(data?.error || 'No se pudo eliminar la cuenta.');
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (e) {
    console.warn('[account] local signOut after deletion failed', e);
  }
};

// Two-step confirmation + deletion + navigation back to the login screen.
// `setBusy` toggles the caller's loading overlay.
export const confirmAndDeleteAccount = ({ navigation, loginRoute, setBusy }) => {
  Alert.alert(
    'Eliminar mi cuenta',
    'Se borrarán tu perfil, favoritos y reseñas. Esta acción no se puede deshacer.',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await deleteMyAccount();
            const root = navigation.getParent?.()?.getParent?.() || navigation.getParent?.();
            if (root?.replace) root.replace(loginRoute);
            else navigation.navigate(loginRoute);
          } catch (e) {
            Alert.alert('Error', e?.message || 'No se pudo eliminar la cuenta.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]
  );
};

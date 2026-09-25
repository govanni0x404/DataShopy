jest.mock('../../supabase/client', () => ({ supabase: {} }));

import { goToAuth, isGuestUser } from '../guest';

const navWithRoot = () => {
  const root = { reset: jest.fn(), getParent: () => undefined };
  const tabs = { getParent: () => root };
  const stack = { getParent: () => tabs };
  return { root, stack };
};

describe('guest helpers', () => {
  test('guests have no UUID id; real accounts do', () => {
    expect(isGuestUser({ name: 'Invitado', email: '' })).toBe(true);
    expect(isGuestUser(null)).toBe(true);
    expect(isGuestUser({ id: '11111111-1111-4111-8111-111111111111' })).toBe(false);
  });

  test('goToAuth resets the root stack from a nested navigator', () => {
    const { root, stack } = navWithRoot();
    goToAuth(stack, 'Login');
    expect(root.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Login' }] });
  });

  test('register keeps Login underneath so "back" works', () => {
    const { root, stack } = navWithRoot();
    goToAuth(stack, 'Register');
    expect(root.reset).toHaveBeenCalledWith({ index: 1, routes: [{ name: 'Login' }, { name: 'Register' }] });
  });
});

import { describe, expect, it, vi } from 'vitest';
import { shouldAutoRedirectAuthenticatedUser, verifySelectedSedeAccess } from './authFlow';

const mockUser = { id: 'user-1' } as any;

describe('auth flow sede selection', () => {
  it('no redirige automáticamente mientras el login con sede está validando', () => {
    expect(
      shouldAutoRedirectAuthenticatedUser({
        user: mockUser,
        authLoading: false,
        loginInProgress: true,
      })
    ).toBe(false);
  });

  it('redirige a un usuario autenticado solo cuando auth está listo y no hay login en curso', () => {
    expect(
      shouldAutoRedirectAuthenticatedUser({
        user: mockUser,
        authLoading: false,
        loginInProgress: false,
      })
    ).toBe(true);
  });

  it('valida acceso a Moquegua usando la función segura de Supabase', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });

    await expect(
      verifySelectedSedeAccess({ rpc }, 'user-1', 'moquegua-id')
    ).resolves.toBe(true);

    expect(rpc).toHaveBeenCalledWith('user_has_sede', {
      _user_id: 'user-1',
      _sede_id: 'moquegua-id',
    });
  });

  it('bloquea la sede cuando Supabase indica que no hay acceso', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });

    await expect(
      verifySelectedSedeAccess({ rpc }, 'user-1', 'arequipa-id')
    ).resolves.toBe(false);
  });
});

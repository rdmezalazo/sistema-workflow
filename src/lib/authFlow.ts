import { User } from '@supabase/supabase-js';

interface RedirectState {
  user: User | null;
  authLoading: boolean;
  loginInProgress: boolean;
}

interface SedeAccessClient {
  rpc: (
    fn: 'user_has_sede',
    args: { _user_id: string; _sede_id: string }
  ) => PromiseLike<{ data: boolean | null; error: unknown }>;
}

export const shouldAutoRedirectAuthenticatedUser = ({
  user,
  authLoading,
  loginInProgress,
}: RedirectState) => Boolean(user) && !authLoading && !loginInProgress;

export const verifySelectedSedeAccess = async (
  client: SedeAccessClient,
  userId: string,
  selectedSedeId: string
) => {
  const { data, error } = await client.rpc('user_has_sede', {
    _user_id: userId,
    _sede_id: selectedSedeId,
  });

  if (error) throw error;
  return data === true;
};
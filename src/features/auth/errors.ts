type AuthAction = 'sign-in' | 'sign-up';

type SupabaseLikeError = { code?: unknown };

export function getAuthErrorMessage(action: AuthAction, error: unknown) {
  const authError = error as SupabaseLikeError | null;
  const code = typeof authError?.code === 'string' ? authError.code : '';

  if (code === 'invalid_credentials') return 'The email or password is incorrect.';
  if (code === 'email_not_confirmed') return 'Confirm your email before signing in.';
  if (code === 'user_already_exists' || code === 'email_exists') {
    return 'An account already exists for this email. Sign in instead.';
  }
  if (code === 'weak_password') return 'Choose a stronger password and try again.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
    return 'Too many attempts. Wait a moment and try again.';
  }

  return action === 'sign-in'
    ? 'We couldn’t sign you in. Check your connection and try again.'
    : 'We couldn’t create your account. Check your connection and try again.';
}

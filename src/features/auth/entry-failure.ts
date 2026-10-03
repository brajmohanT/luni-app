import { isApiClientError } from '@/lib/api/errors';

export function entryFailure(error: unknown, target: 'profile' | 'chat') {
  const code = isApiClientError(error) ? error.code : null;
  if (code === 'MISSING_SESSION' || code === 'MISSING_ACCESS_TOKEN' || code === 'INVALID_ACCESS_TOKEN') {
    return { action: 'sign-in', title: 'Sign in again', message: 'Enter your password to return to Luni.' } as const;
  }
  if (code === 'EMAIL_NOT_CONFIRMED') {
    return { action: 'verify', title: 'Confirm your email', message: 'Open the confirmation email, then try again.' } as const;
  }
  if (code === 'ACCOUNT_DELETION_IN_PROGRESS') {
    return {
      action: 'sign-out',
      title: 'Account deletion in progress',
      message: 'This account can no longer access Luni. Sign out to continue.',
    } as const;
  }
  if (code === 'ONBOARDING_REQUIRED' || code === 'ONBOARDING_PROFILE_INCOMPLETE') {
    return { action: 'profile', title: 'Check your setup', message: 'Reload your saved profile to continue.' } as const;
  }
  return {
    action: 'retry',
    title: target === 'profile' ? 'Couldn’t open your profile' : 'Couldn’t open your conversation',
    message: 'Check your connection and try again.',
  } as const;
}

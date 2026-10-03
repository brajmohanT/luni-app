import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, TextField } from '@/design-system/components';
import { useTheme } from '@/design-system/theme';
import { entryFailure } from '@/features/auth/entry-failure';
import { ProfileScreen } from '@/features/profile/profile-screen';
import { isApiClientError } from '@/lib/api/errors';
import { withRequestTimeout } from '@/lib/api/with-request-timeout';
import { clearAccountChatState } from '@/lib/database/chat-persistence';
import { useAuth } from '@/providers/auth-provider';

type Props = { error: unknown; target: 'profile' | 'chat'; onRetry(): Promise<unknown>; compact?: boolean };

// Keep reauthentication in the current account's screen so its draft survives.
export function EntryRecovery({ error, target, onRetry, compact = false }: Props) {
  const { theme } = useTheme();
  const db = useSQLiteContext();
  const { session, signInWithPassword, signOut } = useAuth();
  const failure = entryFailure(error, target);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const locked = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = async () => {
    if (locked.current) return;
    if (failure.action === 'sign-in' && (!password || !session?.user.email)) {
      setNotice('Enter your password to continue.');
      return;
    }
    locked.current = true;
    setBusy(true);
    setNotice(null);
    try {
      if (failure.action === 'sign-in') {
        await signInWithPassword({ email: session!.user.email!, password });
        if (!mounted.current) return;
        setPassword('');
      }
      if (failure.action === 'sign-out') {
        if (!session?.user.id) return;
        await clearAccountChatState(db, session.user.id);
        if (!mounted.current) return;
        await withRequestTimeout(() => signOut());
        return;
      }
      await onRetry();
    } catch {
      if (mounted.current) setNotice(failure.action === 'sign-in'
        ? 'Couldn’t sign in. Check your password and connection, then try again.'
        : failure.action === 'sign-out'
          ? 'Couldn’t sign out. Check your connection and try again.'
          : 'Couldn’t reload. Check your connection and try again.');
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const requestId = isApiClientError(error) ? error.requestId : null;
  const content = (
    <View style={{ gap: theme.spacing.lg }}>
      {compact && <Text accessibilityRole="alert" style={{ ...theme.typography.secondary, color: theme.colors.text }}>Couldn’t refresh your conversation. Your loaded messages are still here.</Text>}
      {failure.action === 'sign-in' && <>
        <Text style={{ ...theme.typography.secondary, color: theme.colors.textMuted }}>{session?.user.email}</Text>
        <TextField label="Password" value={password} onChangeText={setPassword}
          secureTextEntry autoComplete="current-password" textContentType="password"
          disabled={busy} returnKeyType="go" onSubmitEditing={() => void run()} />
      </>}
      {notice && <Text accessibilityRole="alert" style={{ ...theme.typography.secondary, color: theme.colors.danger }}>{notice}</Text>}
      {requestId && <Text selectable style={{ ...theme.typography.caption, color: theme.colors.textMuted }}>Request ID: {requestId}</Text>}
      <Button
        loading={busy}
        loadingLabel={failure.action === 'sign-in' ? 'Signing in…' : failure.action === 'sign-out' ? 'Signing out…' : 'Loading…'}
        onPress={() => void run()}>
        {failure.action === 'sign-in' ? 'Sign in' : failure.action === 'sign-out' ? 'Sign out' : failure.action === 'profile' ? 'Reload profile' : 'Try again'}
      </Button>
    </View>
  );
  return compact
    ? <View style={{ backgroundColor: theme.colors.canvas, padding: theme.spacing.lg }}>{content}</View>
    : <ProfileScreen title={failure.title} subtitle={failure.message}>{content}</ProfileScreen>;
}

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import * as Crypto from 'expo-crypto';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSendChatMessage } from '@/features/conversations/hooks';
import { ChatSendController } from '@/features/chat/send-controller';
import { supabase } from '@/lib/auth/supabase';
import { getMyProfile } from '@/lib/api/profile';
import { profileKeys } from '@/lib/queries/profile';
import { conversationKeys } from '@/lib/queries/conversations';
import { useAuth } from '@/providers/auth-provider';
import type { ChatResponse } from '@/lib/api/types';

type UseChatComposerOptions = {
  onSuccess(response: ChatResponse): void | Promise<void>;
};

export function useChatComposer({ onSuccess }: UseChatComposerOptions) {
  const mutation = useSendChatMessage();
  const client = useQueryClient();
  const { session } = useAuth();
  const [controller] = useState(() => new ChatSendController(Crypto.randomUUID));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const mounted = useRef(true);
  const recoveryLock = useRef(false);
  const [isRecovering, setIsRecovering] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!state.retryAt || state.now >= state.retryAt) return;
    const timer = setInterval(controller.tick, 1000);
    const subscription = AppState.addEventListener('change', next => { if (next === 'active') controller.tick(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [controller, state.retryAt, state.now]);

  const finish = useCallback(async (response: ChatResponse | null) => {
    if (!response || !mounted.current) return;
    try { await onSuccess(response); }
    catch { if (mounted.current) controller.setNotice('Your message was sent. Refresh the conversation to see the reply.'); }
  }, [controller, onSuccess]);

  const startSend = () => { if (!recoveryLock.current) void controller.start(mutation.mutateAsync).then(finish); };
  const retrySend = () => { if (!recoveryLock.current) void controller.retry(mutation.mutateAsync).then(finish); };
  const recover = async (password?: string) => {
    if (recoveryLock.current || state.isSending || !state.failure) return;
    recoveryLock.current = true;
    setIsRecovering(true);
    try {
      if (state.failure.action === 'session' || state.failure.action === 'verify') {
        const email = session?.user.email;
        const { data, error } = password && email
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.refreshSession();
        if (error || !data.session || data.session.user.id !== session?.user.id) {
          controller.setNotice('We couldn’t restore your session. Enter your password to sign in with the same account.');
          return;
        }
      }
      if (!session) return;
      const profile = await getMyProfile({ expectedUserId: session.user.id });
      if (!mounted.current) return;
      client.setQueryData(profileKeys.detail(session.user.id), profile);
      if (!profile.onboardingCompletedAt) {
        controller.setNotice('Finish your name and conversation setup before retrying. Your draft is kept here.');
        return;
      }
      await client.invalidateQueries({ queryKey: conversationKeys.companion(session.user.id), refetchType: 'none' });
      if (mounted.current) await finish(await controller.retry(mutation.mutateAsync, true));
    } catch {
      if (mounted.current) controller.setNotice('We couldn’t verify your account and setup. Complete the required step, then try this check again.');
    } finally {
      recoveryLock.current = false;
      if (mounted.current) setIsRecovering(false);
    }
  };
  const retrySeconds = Math.max(0, Math.ceil((state.retryAt - state.now) / 1000));
  return {
    draft: state.draft,
    accountEmail: session?.user.email ?? null,
    replyTarget: state.replyTarget,
    selectReply: controller.selectReply,
    errorMessage: state.failure?.message ?? null,
    notice: state.notice,
    hasFailedSend: Boolean(state.failure),
    isSending: state.isSending || isRecovering,
    isEditable: !state.pendingRequest && !state.isSending && !isRecovering,
    canRetry: state.failure?.action === 'retry' && retrySeconds === 0 && !state.isSending && !isRecovering,
    recoveryAction: state.failure?.action ?? null,
    uncertain: state.failure?.uncertain ?? false,
    retrySeconds,
    requestId: state.failure?.requestId ?? null,
    validationError: state.validationError,
    startSend, retrySend, recover,
    editAsNew: controller.editAsNew,
    updateDraft: controller.updateDraft,
  };
}

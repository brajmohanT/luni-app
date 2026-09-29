import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import * as Crypto from 'expo-crypto';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useQueryClient } from '@tanstack/react-query';
import { useSendChatMessage } from '@/features/conversations/hooks';
import { ChatPersistenceError, ChatSendController } from '@/features/chat/send-controller';
import { supabase } from '@/lib/auth/supabase';
import { getMyProfile } from '@/lib/api/profile';
import { profileKeys } from '@/lib/queries/profile';
import { conversationKeys } from '@/lib/queries/conversations';
import { useAuth } from '@/providers/auth-provider';
import type { ChatRequest, ChatResponse, Message } from '@/lib/api/types';
import {
  clearPendingSend,
  loadChatState,
  saveDraft,
  savePendingSend,
} from '@/lib/database/chat-persistence';

type UseChatComposerOptions = {
  onSuccess(response: ChatResponse, request: Readonly<ChatRequest>, replyTarget: Message['replyToMessage']): void | Promise<void>;
  messages?: Message[];
};

const restoredFailure = {
  action: 'retry' as const,
  message: 'We couldn’t confirm Luni’s reply. Your message may already be saved. Retry to check the same send.',
  uncertain: true,
  requestId: null,
  waitSeconds: 0,
};

export function useChatComposer({ onSuccess, messages }: UseChatComposerOptions) {
  const mutation = useSendChatMessage();
  const client = useQueryClient();
  const db = useSQLiteContext();
  const { session } = useAuth();
  const userId = session?.user.id;
  const [controller] = useState(() => new ChatSendController(Crypto.randomUUID));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const mounted = useRef(true);
  const recoveryLock = useRef(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const restoredFor = useRef<string | null>(null);
  const writes = useRef(Promise.resolve());
  const [confirmedMessageId, setConfirmedMessageId] = useState<string | null>(null);
  const enqueue = useCallback((write: () => Promise<void>) => {
    const next = writes.current.then(write, write);
    writes.current = next.catch(() => {});
    return next;
  }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!userId || !messages || restoredFor.current === userId) return;
    let cancelled = false;
    void loadChatState(db, userId).then(async stored => {
      if (cancelled) return;
      restoredFor.current = userId;
      const confirmed = stored.pending?.userMessageId
        && messages.some(message => message.id === stored.pending?.userMessageId);
      if (confirmed) {
        await enqueue(async () => {
          await clearPendingSend(db, userId);
          await saveDraft(db, userId, { body: '', replyTarget: null });
        });
      } else if (stored.pending) {
        controller.restorePending(stored.pending);
      } else {
        controller.restoreDraft(stored.draft);
      }
    }).catch(() => {
      controller.setNotice('This device couldn’t restore your saved draft.');
    }).finally(() => {
      if (!cancelled && mounted.current) setIsRestoring(false);
    });
    return () => { cancelled = true; };
  }, [controller, db, enqueue, messages, userId]);
  useEffect(() => {
    if (!state.retryAt || state.now >= state.retryAt) return;
    const timer = setInterval(controller.tick, 1000);
    const subscription = AppState.addEventListener('change', next => { if (next === 'active') controller.tick(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [controller, state.retryAt, state.now]);

  const finish = useCallback(async (response: ChatResponse | null) => {
    if (!response || !mounted.current) return;
    if (userId) {
      try {
        await enqueue(async () => {
          await clearPendingSend(db, userId);
          await saveDraft(db, userId, { body: '', replyTarget: null });
        });
      } catch {
        controller.setNotice('Your message was sent, but this device couldn’t clear its recovery copy.');
      }
    }
  }, [controller, db, enqueue, userId]);

  const persistedSend = useCallback(async (request: Parameters<typeof mutation.mutateAsync>[0]) => {
    if (!userId) return mutation.mutateAsync(request);
    const snapshot = controller.getSnapshot();
    setConfirmedMessageId(null);
    try {
      await enqueue(() => savePendingSend(db, userId, {
        request,
        replyTarget: snapshot.replyTarget,
        failure: snapshot.failure ?? { ...restoredFailure, requestId: request.clientRequestId },
        retryAt: snapshot.retryAt,
      }));
    } catch (cause) {
      throw new ChatPersistenceError({ cause });
    }
    const response = await mutation.mutateAsync(request);
    // Publish the confirmed rows before the controller removes the pending row.
    // Disk cleanup must not create an intermediate history-only render.
    setConfirmedMessageId(response.userMessageId);
    if (mounted.current) {
      try { await onSuccess(response, request, snapshot.replyTarget); }
      catch { controller.setNotice('Your message was sent. Refresh the conversation to see the reply.'); }
    }
    void enqueue(() => savePendingSend(db, userId, {
      request,
      replyTarget: snapshot.replyTarget,
      failure: snapshot.failure ?? { ...restoredFailure, requestId: request.clientRequestId },
      retryAt: snapshot.retryAt,
      userMessageId: response.userMessageId,
    })).catch(() => {});
    return response;
  }, [controller, db, enqueue, mutation, onSuccess, userId]);

  useEffect(() => {
    if (isRestoring || !userId) return;
    const timer = setTimeout(() => {
      const snapshot = controller.getSnapshot();
      void enqueue(async () => {
        await saveDraft(db, userId, { body: snapshot.draft, replyTarget: snapshot.replyTarget });
        if (snapshot.pendingRequest && snapshot.failure) {
          await savePendingSend(db, userId, {
            request: snapshot.pendingRequest,
            replyTarget: snapshot.replyTarget,
            failure: snapshot.failure,
            retryAt: snapshot.retryAt,
          });
        } else if (!snapshot.pendingRequest) {
          await clearPendingSend(db, userId);
        }
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [controller, db, enqueue, isRestoring, state.draft, state.failure, state.pendingRequest,
    state.replyTarget, state.retryAt, userId]);
  useEffect(() => {
    if (isRestoring || !userId) return;
    const flush = () => {
      const snapshot = controller.getSnapshot();
      void enqueue(async () => {
        await saveDraft(db, userId, { body: snapshot.draft, replyTarget: snapshot.replyTarget });
        if (snapshot.pendingRequest && snapshot.failure) {
          await savePendingSend(db, userId, {
            request: snapshot.pendingRequest,
            replyTarget: snapshot.replyTarget,
            failure: snapshot.failure,
            retryAt: snapshot.retryAt,
          });
        } else if (!snapshot.pendingRequest) {
          await clearPendingSend(db, userId);
        }
      });
    };
    const subscription = AppState.addEventListener('change', next => {
      if (next !== 'active') flush();
    });
    return () => {
      subscription.remove();
      flush();
    };
  }, [controller, db, enqueue, isRestoring, userId]);

  const startSend = () => { if (!recoveryLock.current && !isRestoring) void controller.start(persistedSend).then(finish); };
  const retrySend = () => { if (!recoveryLock.current && !isRestoring) void controller.retry(persistedSend).then(finish); };
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
      if (mounted.current) await finish(await controller.retry(persistedSend, true));
    } catch {
      if (mounted.current) controller.setNotice('We couldn’t verify your account and setup. Complete the required step, then try this check again.');
    } finally {
      recoveryLock.current = false;
      if (mounted.current) setIsRecovering(false);
    }
  };
  const retrySeconds = Math.max(0, Math.ceil((state.retryAt - state.now) / 1000));
  return {
    draft: state.pendingRequest ? '' : state.draft,
    optimisticMessage: state.pendingRequest && state.pendingCreatedAt
      && !messages?.some(message => message.id === confirmedMessageId) ? {
      id: state.pendingRequest.clientRequestId,
      role: 'user' as const,
      content: state.pendingRequest.message,
      replyToMessageId: state.pendingRequest.replyToMessageId ?? null,
      replyToMessage: state.replyTarget,
      createdAt: state.pendingCreatedAt,
    } : null,
    accountEmail: session?.user.email ?? null,
    replyTarget: state.replyTarget,
    selectReply: controller.selectReply,
    errorMessage: state.failure?.message ?? null,
    notice: state.notice,
    hasFailedSend: Boolean(state.failure),
    isSending: state.isSending || isRecovering || isRestoring,
    isEditable: !state.pendingRequest && !state.isSending && !isRecovering && !isRestoring,
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

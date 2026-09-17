import { useCallback, useState } from 'react';
import * as Crypto from 'expo-crypto';

import { useSendChatMessage } from '@/features/conversations/hooks';
import { isApiClientError } from '@/lib/api/errors';
import type { ChatRequest, ChatResponse } from '@/lib/api/types';

type UseChatComposerOptions = {
  conversationId?: string;
  onSuccess(response: ChatResponse): void | Promise<void>;
};

function getSendErrorMessage(error: unknown) {
  if (isApiClientError(error) && error.code === 'PAYLOAD_TOO_LARGE') {
    return 'Your message is too long.';
  }

  return 'Your message wasn’t sent. Try again.';
}

// Manages one draft and its idempotent send lifecycle.
export function useChatComposer({ conversationId, onSuccess }: UseChatComposerOptions) {
  const sendMessage = useSendChatMessage();
  const [draft, setDraft] = useState('');
  const [pendingRequest, setPendingRequest] = useState<ChatRequest | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const send = useCallback(
    async (request: ChatRequest) => {
      try {
        const response = await sendMessage.mutateAsync(request);

        setDraft('');
        setPendingRequest(null);
        await onSuccess(response);
      } catch {
        // The mutation state drives the retry UI.
      }
    },
    [onSuccess, sendMessage],
  );

  // Creates a UUID once, before the first request leaves the device.
  const startSend = useCallback(() => {
    const message = draft.trim();

    if (!message) {
      setValidationError('Write a message before sending.');
      return;
    }

    const request: ChatRequest = {
      message,
      clientRequestId: Crypto.randomUUID(),
      ...(conversationId ? { conversationId } : {}),
    };

    setValidationError(null);
    setPendingRequest(request);
    sendMessage.reset();
    void send(request);
  }, [conversationId, draft, send, sendMessage]);

  // Replays the identical request after a recoverable failure.
  const retrySend = useCallback(() => {
    if (!pendingRequest) {
      return;
    }

    sendMessage.reset();
    void send(pendingRequest);
  }, [pendingRequest, send, sendMessage]);

  // Editing after a failure starts a new message with a new request ID.
  const updateDraft = useCallback(
    (value: string) => {
      setDraft(value);
      setValidationError(null);

      if (sendMessage.isError) {
        setPendingRequest(null);
        sendMessage.reset();
      }
    },
    [sendMessage],
  );

  const requestId = isApiClientError(sendMessage.error) ? sendMessage.error.requestId : null;

  return {
    draft,
    errorMessage: sendMessage.isError ? getSendErrorMessage(sendMessage.error) : null,
    hasFailedSend: sendMessage.isError && Boolean(pendingRequest),
    isSending: sendMessage.isPending,
    requestId,
    retrySend,
    startSend,
    updateDraft,
    validationError,
  };
}

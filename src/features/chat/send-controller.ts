import { isApiClientError } from '@/lib/api/errors';
import { chatRequestSchema, type ChatRequest, type ChatResponse, type ReplyTarget } from '@/lib/api/types';
import type { StoredDraft, StoredPendingSend } from '@/lib/database/chat-persistence';

export type RecoveryAction = 'retry' | 'edit' | 'session' | 'verify' | 'onboarding' | 'blocked';
export type SendFailure = {
  action: RecoveryAction;
  message: string;
  uncertain: boolean;
  requestId: string | null;
  waitSeconds: number;
  removeQuote?: boolean;
};

export class ChatPersistenceError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('Unable to save the pending message on this device.', options);
    this.name = 'ChatPersistenceError';
  }
}

export function classifySendFailure(error: unknown): SendFailure {
  if (error instanceof ChatPersistenceError) {
    return {
      action: 'retry',
      message: 'This device couldn’t save your message for safe recovery. Try sending it again.',
      uncertain: false,
      requestId: null,
      waitSeconds: 0,
    };
  }
  const api = isApiClientError(error) ? error : null;
  const base = { requestId: api?.requestId ?? null, waitSeconds: api?.retryAfterSeconds ?? 0 };
  switch (api?.code) {
    case 'CHAT_REQUEST_IN_PROGRESS':
    case 'CONVERSATION_BUSY':
      return { ...base, action: 'retry', uncertain: true, waitSeconds: api.retryAfterSeconds ?? 3,
        message: 'Luni is still processing a message. Retry after the wait to check this send.' };
    case 'MISSING_SESSION':
    case 'MISSING_ACCESS_TOKEN':
    case 'INVALID_ACCESS_TOKEN':
      return { ...base, action: 'session', uncertain: true, message: 'Sign in with the same account before retrying. Your message is kept here.' };
    case 'EMAIL_NOT_CONFIRMED':
      return { ...base, action: 'verify', uncertain: false, message: 'Confirm your email, then check verification to retry this message.' };
    case 'ONBOARDING_REQUIRED':
    case 'ONBOARDING_PROFILE_INCOMPLETE':
      return { ...base, action: 'onboarding', uncertain: false, message: 'Complete your name and conversation setup before retrying. Your message is kept here.' };
    case 'REPLY_TARGET_NOT_FOUND':
      return { ...base, action: 'edit', uncertain: false, removeQuote: true, message: 'The quoted message is unavailable. Edit your message to remove the quote before sending.' };
    case 'VALIDATION_ERROR':
    case 'INVALID_JSON':
    case 'INVALID_REQUEST':
    case 'PAYLOAD_TOO_LARGE':
      return { ...base, action: 'edit', uncertain: false, message: 'Check your message before sending again. Use 1–4,000 characters.' };
    case 'CHAT_REQUEST_PAYLOAD_MISMATCH':
      return { ...base, action: 'blocked', uncertain: true, message: 'This request ID belongs to a different message. Check your conversation before creating a new send.' };
    case 'CONVERSATION_NOT_FOUND':
    case 'COMPANION_CONVERSATION_NOT_FOUND':
    case 'ROUTE_NOT_FOUND':
      return { ...base, action: 'blocked', uncertain: true, message: 'The conversation is unavailable. Reload your conversation before creating a new send.' };
    default:
      if (!api || api.code === 'NETWORK_ERROR' || api.code === 'INVALID_RESPONSE' || (api.status ?? 0) >= 500 || api.status === 429) {
        return { ...base, action: 'retry', uncertain: true, message: 'We couldn’t confirm Luni’s reply. Your message may already be saved. Retry to check the same send.' };
      }
      return { ...base, action: 'blocked', uncertain: true, message: 'This send needs attention. Check your conversation before creating a new message.' };
  }
}

type ComposerState = {
  draft: string;
  replyTarget: ReplyTarget | null;
  pendingRequest: Readonly<ChatRequest> | null;
  failure: SendFailure | null;
  isSending: boolean;
  validationError: string | null;
  retryAt: number;
  now: number;
  notice: string | null;
  pendingMayBeSaved: boolean;
};

// One in-memory send lifecycle. Synchronous transitions also guard rapid taps.
export class ChatSendController {
  private state: ComposerState;
  private listeners = new Set<() => void>();
  constructor(private uuid: () => string, private clock: () => number = Date.now) {
    this.state = { draft: '', replyTarget: null, pendingRequest: null, failure: null,
      isSending: false, validationError: null, retryAt: 0, now: clock(), notice: null, pendingMayBeSaved: false };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private change(patch: Partial<ComposerState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  tick = () => { this.change({ now: this.clock() }); };
  setNotice = (notice: string) => { this.change({ notice }); };
  restoreDraft = (draft: StoredDraft | null) => {
    if (!draft || this.state.pendingRequest || this.state.draft || this.state.replyTarget) return;
    this.change({ draft: draft.body, replyTarget: draft.replyTarget });
  };
  restorePending = (pending: StoredPendingSend) => {
    if (this.state.pendingRequest || this.state.isSending) return;
    this.change({
      draft: pending.request.message,
      replyTarget: pending.replyTarget,
      pendingRequest: Object.freeze({ ...pending.request }),
      failure: pending.failure,
      retryAt: pending.retryAt,
      now: this.clock(),
      pendingMayBeSaved: pending.failure.uncertain,
      notice: 'Your unfinished send was restored from this device.',
    });
  };
  updateDraft = (draft: string) => {
    if (!this.state.pendingRequest && !this.state.isSending) this.change({ draft, validationError: null, notice: null });
  };
  selectReply = (replyTarget: ReplyTarget | null) => {
    if (!this.state.pendingRequest && !this.state.isSending) this.change({ replyTarget: replyTarget ? Object.freeze({ ...replyTarget }) : null });
  };
  editAsNew = () => {
    if (this.state.isSending || !this.state.failure) return;
    this.change({ pendingRequest: null, failure: null, validationError: null, pendingMayBeSaved: false,
      replyTarget: this.state.failure.removeQuote ? null : this.state.replyTarget,
      notice: 'You’re editing a new message. Sending will create a new request.' });
    // Keep the server deadline even if the user chooses to edit.
  };
  start = async (send: (request: ChatRequest) => Promise<ChatResponse>) => {
    if (this.state.isSending || this.state.pendingRequest || this.clock() < this.state.retryAt) return null;
    const parsed = chatRequestSchema.safeParse({ message: this.state.draft,
      clientRequestId: this.uuid(), ...(this.state.replyTarget ? { replyToMessageId: this.state.replyTarget.id } : {}) });
    if (!parsed.success) {
      this.change({ validationError: 'Write a message using 1–4,000 characters.' });
      return null;
    }
    const request = Object.freeze(parsed.data);
    this.change({ pendingRequest: request });
    return this.run(request, send);
  };
  retry = async (send: (request: ChatRequest) => Promise<ChatResponse>, recovered = false) => {
    const { pendingRequest, failure, isSending } = this.state;
    if (!pendingRequest || !failure || isSending || this.clock() < this.state.retryAt) return null;
    const recoveryAllowed = recovered && ['session', 'verify', 'onboarding'].includes(failure.action);
    if (failure.action !== 'retry' && !recoveryAllowed) return null;
    return this.run(pendingRequest, send);
  };
  private async run(request: ChatRequest, send: (request: ChatRequest) => Promise<ChatResponse>) {
    this.change({ isSending: true, failure: null, validationError: null, notice: null });
    try {
      const response = await send(request);
      this.change({ isSending: false, draft: '', replyTarget: null, pendingRequest: null,
        failure: null, retryAt: 0, now: this.clock(), pendingMayBeSaved: false });
      return response;
    } catch (error) {
      const failure = classifySendFailure(error);
      failure.uncertain ||= this.state.pendingMayBeSaved;
      const now = this.clock();
      this.change({ isSending: false, failure, now, pendingMayBeSaved: failure.uncertain,
        retryAt: Math.min(Number.MAX_SAFE_INTEGER, now + failure.waitSeconds * 1000) });
      return null;
    }
  }
}

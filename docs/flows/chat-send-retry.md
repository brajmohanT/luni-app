# Chat send and retry

The app uses non-streaming API v2 chat. The query layer checks the saved profile and initializes the companion before sending. Chat payloads contain message, clientRequestId, and an optional replyToMessageId; they never contain conversationId.

## Sending

- ChatSendController validates the trimmed draft, freezes the request, and locks text/quote editing while it is pending.
- The send hook uses clientRequestId as X-Request-Id. Retries retain both IDs and the original text/quote target.
- Synchronous guards prevent overlapping send/retry taps. TanStack mutations do not retry automatically.
- Confirmed success clears the pending send and refreshes history. Display/navigation failures after success do not turn it back into a retryable send.

## Recovery

- Network failures, invalid responses, and temporary server failures keep the original request. The UI says the message may already be saved.
- Busy/in-progress conflicts respect Retry-After and use a three-second fallback if the header is missing. A deadline guards both the handler and button; the countdown updates on foreground return.
- Validation errors require editing. Missing reply targets require editing without the quote. Payload mismatches and missing routes/conversations do not offer a blind retry.
- Authentication recovery can refresh the session or use the existing account email and a password entered in the composer. A different account cannot replay the request. Email/setup recovery checks the server profile before allowing replay. Onboarding screen navigation remains part of the screen migration.
- Editing an uncertain send requires confirmation that the original may already exist. The next send uses a new ID. Editing does not bypass an outstanding server cooldown.
- A later error cannot erase uncertainty from an earlier failed attempt.

## Current limits

The controller stores pending state only while its composer remains mounted. App restart, leaving the screen, or an account change can discard it. SQLite persistence and recovery across those boundaries remain later work. The existing new-chat/detail routes are transitional; continuous-chat routing is still pending.

## Checks

Run `node --test scripts/check-chat-retry.cjs scripts/check-query-hooks.cjs scripts/check-api-client.cjs`.
The retry suite checks state transitions and composer action props with mocked native controls. It does not replace native keyboard, alert, authentication, or screen-reader tests.

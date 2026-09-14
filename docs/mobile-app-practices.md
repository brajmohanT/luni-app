# Mobile app practices

Use this document to implement Luni's mobile reliability, privacy, release, and testing requirements.

## Scope

Luni starts as a text-chat companion with user-controlled memory. Build the first mobile release around reliable chat, private data, and safe releases.

## Client and backend boundary

| Mobile client | Backend |
| --- | --- |
| Screens, navigation, drafts, recent-chat cache | Authentication and account access |
| Secure token storage, notifications, deep links | Conversation storage and AI generation |
| Message status, retry controls, telemetry | Memory extraction, review, deletion, and retention |
| Store purchase flow | Entitlements, store verification, feature flags, audit logs |

Keep product rules on the backend. The client renders state and sends user actions.

## Chat state

Use one message state model:

```text
draft -> sending -> sent | failed
sent -> response streaming -> complete | failed
```

- Generate an idempotency key before the client sends a message.
- Save unsent drafts on the device.
- Show a failed state and a retry action after a network or server failure.
- Restore the latest conversation after an app restart.
- Cache recent conversations for reading without a connection.
- Do not mark a message as sent until the backend accepts it.

## API compatibility

- Use typed API contracts.
- Add response fields without changing existing field meaning.
- Accept missing optional fields from older clients.
- Keep endpoints while supported app versions call them.
- Send app version and platform with each API request.
- Track error rates by app version.

Support the current release and two prior major releases. Require an update for a security, data-integrity, or service-compatibility issue.

## Memory and privacy

- Store chat messages and derived memories as separate records.
- Give users a memory list with edit, delete, and disable controls.
- Ask for consent before Luni stores durable memory or uses data beyond the service.
- Provide data export and account deletion.
- Define retention for chats, memories, logs, analytics, and backups.
- Check account ownership on the server for each read and write.
- Store session tokens in platform secure storage.
- Keep private conversation text out of lock-screen notifications.

## Navigation, deep links, and notifications

Define stable routes for conversations, invitations, account recovery, subscriptions, and notification actions.

Handle each route when the user:

- Opens Luni from a cold start.
- Opens a link while viewing another conversation.
- Has signed out.
- Uses an older supported app version.
- Opens deleted or unavailable content.

Treat each notification action as a deep link. Do not put private chat text in notification previews by default.

## Releases and rollback

- Release to internal testers before public users.
- Roll out production releases in cohorts.
- Add an off switch for risky memory, prompt, pricing, and UI changes.
- Record a flag owner, purpose, expiry date, rollout percentage, and rollback action.
- Remove flags after the rollout decision.
- Track crashes, request failures, message failures, model latency, and payment failures for each app version.

## Payments

- Verify App Store and Play Store purchases on the backend.
- Store account entitlements on the backend.
- Support restore purchase, renewal, cancellation, refund, grace period, and device change.
- Keep a support procedure for missing or delayed entitlements.

## Testing

| Level | Cover |
| --- | --- |
| Unit | Authorization, memory rules, entitlement rules, retries, idempotency |
| Integration | Sign-in, conversations, memory deletion, data export, account deletion, store webhooks |
| End to end | Onboarding, first chat, message retry, app restart, purchase restore |
| Manual device check | Slow network, no network, backgrounding, foregrounding, interrupted streaming |

Test on a current iPhone, an older supported iPhone, a Pixel-class Android device, and a common Samsung device.

## Monitoring

Measure:

- Crash-free users and sessions.
- Message-send failure rate and retry rate.
- API and AI-provider failures.
- Time to first AI token and time to complete a response.
- Memory and battery use during long conversations.
- Purchase and entitlement failures.

Use p50, p95, and p99 latency metrics.

## External services

Review each analytics, push, payment, AI, and session-replay SDK before adding it. Record the vendor, data sent, permission, owner, review date, and removal plan.

## Accessibility and language support

- Support screen readers, text scaling, contrast, focus order, and touch targets.
- Keep text separate from application logic.
- Test layouts with longer translated strings.

## Release gate

Ship an external beta after Luni can:

- Resume a conversation after an app restart.
- Recover a failed message without sending it twice.
- Show, edit, disable, export, and delete memory.
- Handle lost network access without misleading the user.
- Roll back a harmful remote change.

Before paid launch, add purchase restoration, entitlement support procedures, and incident runbooks for provider outages, unsafe output, incorrect memory, deletion failures, and billing mismatches.

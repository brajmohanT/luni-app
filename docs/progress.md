# Mobile app progress

Use this document to track Luni mobile delivery, blockers, and release gates.

Status: planning. The `luni-app` folder has no Expo application yet.

## Foundation

- [ ] Create `packages/contracts` with shared Zod schemas for API requests, responses, and errors.
- [ ] Add backend tests for authentication, chat idempotency, conversations, memory deletion, and account deletion.
- [ ] Create the Expo app with TypeScript, Expo Router, EAS development builds, SecureStore, and SQLite.
- [ ] Connect Supabase authentication to the Luni API.

## Chat and memory

- [ ] Build onboarding, conversation list, cached chat, drafts, retry controls, and error states.
- [ ] Define streaming events, cancellation, reconnect, partial output, duplicate requests, and failed requests.
- [ ] Implement response streaming.
- [ ] Add memory view, correction, and deletion controls.

## External beta gate

- [ ] Store drafts, pending messages, and recent chat in SQLite. Keep the server as the source of truth.
- [ ] Configure EAS Update channels, rollout percentages, and `runtimeVersion`.
- [ ] Send privacy-safe Sentry and analytics events from the mobile app and API.
- [ ] Add Jest, `jest-expo`, React Native Testing Library, and end-to-end coverage for onboarding, message retry, app restart, memory deletion, and purchase restore.

## Later work

- [ ] Add RevenueCat after paid-plan and support flows are ready.
- [ ] Add notifications after the team defines consent timing, private payload rules, token handling, and deep-link fallback.

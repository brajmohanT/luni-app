# Mobile app progress

Use this document to track Luni mobile delivery, blockers, and release gates.

Status: foundation in progress. The Expo application runs with TypeScript, Expo Router, TanStack Query, SecureStore, and SQLite.

Current status: the first local Android development build installed and launched successfully on a connected physical device. The login and sign-up screens render correctly. The prior Windows CMake object-path issue was addressed by relocating the app to a shorter path and using pnpm's hoisted node-modules layout.

## Foundation

- [ ] Create `packages/contracts` with shared Zod schemas for API requests, responses, and errors.
- [ ] Add backend tests for authentication, chat idempotency, conversations, memory deletion, and account deletion.
- [x] Create the Expo app with TypeScript and Expo Router.
- [x] Add TanStack Query, SecureStore, and the SQLite persistence foundation.
- [x] Add the Supabase client, session provider, and protected auth/app route groups.
- [x] Add React Hook Form, Zod, and the Zod resolver for typed form validation.
- [x] Build validated email/password sign-in and sign-up forms connected to Supabase Auth.
- [x] Set the Android application ID to `com.vibeken.luni`.
- [x] Add `expo-dev-client` and generate the initial ignored `android/` project for local development builds.
- [x] Complete the first local Android development build and install it on a physical device; verified the login and sign-up screens render.
- [ ] Configure EAS development builds.
- [x] Add a typed Luni API client with Supabase bearer authentication, request IDs, app metadata headers, OpenAPI response parsing, and typed errors.
- [x] Add TanStack Query hooks for conversation lists, conversation messages, and non-retrying chat sends.
- [ ] Connect conversation screens to the authenticated Luni API.
- [ ] Re-enable Supabase email confirmation and implement the `luniapp://auth/callback` deep-link flow before external testing.

## Chat and memory

- [x] Build the authenticated conversation list with loading, empty, refresh, and retry states.
- [x] Build conversation detail with chronological message rendering, refresh, and recovery states.
- [x] Build new chat with non-streaming send, idempotency keys, and explicit retry.
- [x] Share the composer between new and existing conversations, including send and retry state.
- [ ] Build onboarding, cached chat, drafts, and app-restart recovery.
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

# Mobile app progress

Use this document to track Luni mobile delivery, blockers, and release gates.

Status: foundation in progress. The Expo application runs with TypeScript, Expo Router, TanStack Query, SecureStore, and SQLite.

Current status: the first local Android development build is running for installation on a connected physical device. The prior Windows CMake object-path issue was addressed by relocating the app to a shorter path and using pnpm's hoisted node-modules layout. Confirm installation and launch before marking this gate complete.

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
- [x] Complete the first local Android development build and install it on a physical device (build currently running; verify installation and launch).
- [ ] Configure EAS development builds.
- [ ] Connect the authenticated Supabase session to the Luni API.
- [ ] Re-enable Supabase email confirmation and implement the `luniapp://auth/callback` deep-link flow before external testing.

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

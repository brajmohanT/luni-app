# Mobile app progress

Use this document to track Luni mobile delivery, blockers, and release gates.

Last updated: 2026-09-26.

Status: shared UI foundations implemented; onboarding migration is next. The Expo application runs with TypeScript, Expo Router, TanStack Query, SecureStore, and SQLite. Authentication and non-streaming conversation screens are connected; migration of those screens to the approved design remains pending.

Current status: the first local Android development build installed and launched successfully on a connected physical device. The login and sign-up screens render correctly. The prior Windows CMake object-path issue was addressed by relocating the app to a shorter path and using pnpm's hoisted node-modules layout.

The user has also reviewed the Design System preview on Android and confirmed that the brand artwork, controls, settings rows, and switches look good. This is a visual review, not a complete accessibility or device test pass.

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
- [x] Connect conversation screens to the authenticated Luni API.
- [ ] Re-enable Supabase email confirmation and implement the `luniapp://auth/callback` deep-link flow before external testing.

## Design system and screen migration

Approved visual reference: [Design library](design/index.html). Implementation and usage: [Design system README](../src/design-system/README.md).

- [x] Add color, typography, spacing, sizing, radii, and motion tokens under `src/design-system/tokens/`.
- [x] Mount `ThemeProvider` with light/dark/system preference and `useTheme()`.
- [x] Preserve chat blue `#0054FD`, dark incoming bubbles `#282A30`, and filled blue reaction color tokens.
- [x] Extract the supplied logo and approved identity/welcome gradients; add `LuniLogo`, `BrandBackground`, and identity grain texture.
- [x] Add Button, IconButton, and TextField with disabled, loading, focus, and error states where applicable.
- [x] Add SettingsRow navigation/toggle/info variants and controlled Switch.
- [x] Add `/design-system` with an **Open Design System · Dev** launcher, isolated theme switching, and local interactive examples. Production builds disable the launcher and route access.
- [x] Complete user visual review of the preview on Android.
- [ ] Complete TalkBack, keyboard, larger-text, and wider device checks. iOS review remains pending.
- [ ] Select the final font family. Keep platform defaults until that decision.
- [ ] Migrate onboarding: welcome → sign-in → preferred name → conversation style → first chat.
- [ ] Connect onboarding state and persistence after checking the existing auth and backend contracts. Prototype actions are simulations, not implemented services.
- [ ] Migrate chat to the approved bubbles, supplied profile pictures, filled blue reactions, composer, and recovery states while preserving send/retry behavior.
- [ ] Build the approved settings screens and persist the appearance preference. Current theme preferences live in memory.

Validation completed for the shared UI: TypeScript, ESLint, brand geometry/logo checks, light/dark rendered accessibility checks, and an Android development bundle export. These checks do not replace native interaction or screen-reader testing.

Next implementation pass: onboarding. Keep the development preview available during screen migration. Existing authentication and conversation screens still use their earlier UI.

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

## API v2 migration: types and validation (2026-09-26)

- [x] Add profile/style, partial profile-update, companion initialization, paginated history, reply-target, and chat-result schemas and inferred types.
- [x] Match v2 error codes; validate UUIDs, timestamps, name/message bounds, and pagination inputs. Reject empty profile updates and unknown request fields, including conversationId on chat sends.
- [x] Remove conversation titles and stop the existing composer from including conversationId. Keep deprecated list/history exports temporarily for consumers awaiting endpoint migration.
- [ ] Migrate endpoint functions, query hooks, retry behavior, routing, and onboarding/chat UI in the remaining milestones. The app is not yet end-to-end compatible with v2.

Verification: 63 in-memory validation assertions passed, including comparison of error codes against OpenAPI. Targeted ESLint and git diff --check passed. Full TypeScript checking reported unresolved react-native-svg declarations in three unchanged design-system/preview files; no other TypeScript errors were reported. pnpm exec could not locate the tsc/eslint command shims, so checks used the installed Node entry points. No native flow test was performed for this schema-only step. The pre-existing OpenAPI working-tree change was preserved.

## API v2 migration: request client (2026-09-26)

- [x] Support PATCH and PUT alongside GET/POST; preserve bodyless calls without a JSON body or Content-Type.
- [x] Accept a caller-provided requestId for X-Request-Id, with UUID generation when omitted. Retain the outgoing ID on network errors or responses without a server request ID.
- [x] Expose retryAfterSeconds on ApiClientError. Parse positive integer seconds per OpenAPI; use null for missing or invalid values, including unsafe integers. Preserve metadata even when error JSON is malformed.
- [x] Add scripts/check-api-client.cjs with mocked HTTP/session checks. Run with node --test scripts/check-api-client.cjs.
- [ ] Wire stable IDs and retry delays into endpoint callers and the send lifecycle in later steps. The request client does not perform automatic retries.

Verification: 19 mocked HTTP tests passed; targeted ESLint and diff whitespace checks passed. Full TypeScript checking still reports only the three unresolved react-native-svg declaration errors in unchanged design-system/preview files. No live backend or device flow test was performed in this step.

## API v2 migration: profile API functions (2026-09-26)

- [x] Add getMyProfile (GET /me), updateMyProfile (PATCH /me), and completeMyOnboarding (bodyless POST /me/onboarding/complete) in src/lib/api/profile.ts.
- [x] Validate partial updates before sending, trim names, and validate all returned profiles. Forward optional request IDs and abort signals through the shared authenticated client.
- [x] Add nine profile regression tests covering defaults, partial writes, invalid input, bodyless completion, response validation, request options, and onboarding conflict metadata.
- [ ] Connect profile query/mutation hooks and onboarding screens in later steps.

Verification: all 28 mocked HTTP tests and targeted ESLint passed. Full TypeScript checking still reports the same three unresolved react-native-svg declaration errors in unchanged files. No live API or device flow test was performed.

## TypeScript verification correction (2026-09-26)

The three react-native-svg resolution errors reported above came from sandbox file-access restrictions, not missing declarations or application code. Reading node_modules/react-native-svg/package.json inside the sandbox returned Access denied. Outside the sandbox, the manifest correctly declares lib/typescript/index.d.ts, and node node_modules/typescript/bin/tsc --noEmit passes with exit code 0. No dependency reinstall, type shim, or tsconfig change is needed. Run future TypeScript checks with sufficient read access to the installed package.

## API v2 migration: conversation API functions (2026-09-26)

- [x] Replace list and ID-based history functions with bodyless putCompanionConversation and paginated getCompanionMessages. Validate pagination inputs and encode opaque cursors.
- [x] Update sendChatMessage to accept optional request ID/cancellation options while validating the strict v2 message/clientRequestId/replyToMessageId payload and persisted result IDs.
- [x] Remove obsolete list/history schema aliases and types. Adapt existing hooks to read companion history, with a temporary single-conversation list adapter until routing migration. No removed conversation endpoints remain in the API functions.
- [x] Add eight conversation API regression tests; the combined mocked HTTP suite now has 36 passing tests.
- [ ] Implement companion initialization sequencing, profile gating, infinite history queries, and cache updates in the next hook milestone. Current list/detail screens remain transitional; accounts without a companion receive the server's missing-companion error until initialization is wired.

Verification: all 36 tests, full TypeScript checking outside the sandbox, targeted ESLint, and diff whitespace checks passed. No live backend or native flow test was performed.

## API v2 migration: query and mutation hooks (2026-09-26)

- [x] Add useMyProfile, useUpdateMyProfile, and useCompleteMyOnboarding. Cache server-confirmed profiles, serialize profile mutations, cancel competing reads, and reject older profile versions when newer data is cached.
- [x] Add companion initialization and infinite history hooks. Sequence profile read, completed-onboarding check, companion PUT, then history GET. Expose fetchNextPage/hasNextPage; flatten newest-first pages into chronological messages and deduplicate server message IDs without losing quotes.
- [x] Invalidate/refetch the sending account's history after successful chat sends. Reuse clientRequestId as the chat correlation header; retain explicit, non-automatic mutation retries.
- [x] Scope keys and query clients by account. Remount query consumers and clear the prior cache on sign-out/account change. Forward expectedUserId to the API client so delayed operations cannot use another account's access token.
- [x] Keep temporary list/detail hook adapters for the existing screens. Incomplete onboarding surfaces ONBOARDING_REQUIRED; onboarding routes and pagination controls remain screen-migration work.
- [x] Add scripts/check-query-hooks.cjs using the real QueryClient, mutation cache, and InfiniteQueryObserver with mocked API functions. Add transport account-guard tests to check-api-client.cjs.

Verification: 49 tests passed across both scripts; full TypeScript and targeted ESLint passed outside the sandbox; diff whitespace checks passed. Tests cover API sequencing, onboarding gates/completion, cursor pagination, quote/ID retention, profile mutation serialization, account-specific invalidation, canceled reads, and session mismatch. No native account-switch or live backend flow test was performed. Retry-After timing/recovery UI and final routes remain later milestones.

## API v2 migration: safe retry behavior (2026-09-26)

- [x] Add an in-memory ChatSendController with immutable pending text/quote/ID, synchronous duplicate-tap guards, strict local validation, and confirmed-success cleanup.
- [x] Classify transient, validation, quote, payload-mismatch, auth/verification, and onboarding failures. Retain uncertainty across later failures and avoid claiming an unconfirmed message was not saved.
- [x] Respect Retry-After with a deadline and countdown, including foreground updates. Editing into a new send cannot bypass the remaining wait.
- [x] Lock pending text/quotes; require explicit edit-as-new confirmation for uncertain sends. Remove unavailable quotes when editing and use a fresh ID for the new send.
- [x] Add session/profile recovery checks and same-account password recovery using shared Button/TextField controls. Keep full onboarding navigation for screen migration.
- [x] Wire current screens to recovery controls and update the chat-send-retry flow guide.

Verification: all 63 tests across the API, query, and retry scripts passed, along with full TypeScript, targeted ESLint, and diff whitespace checks. The 14 new tests cover lost responses, identical replay payloads, repeated taps, deadlines, explicit editing, error classification, and composer action props. Native/device interaction and live auth tests remain pending. Pending sends do not yet survive composer unmount, account changes, or app restart; persistence remains deferred.

# Mobile app progress

Use this document to track Luni mobile delivery, blockers, and release gates.

Last updated: 2026-09-28.

Status: shared UI foundations, Welcome/password authentication, and preferred-name onboarding are implemented. Conversation-style selection, completion, and continuous-chat entry are implemented; Android review and the chat visual migration remain. The Expo application runs with TypeScript, Expo Router, TanStack Query, SecureStore, and SQLite. Authentication and non-streaming conversation screens are connected; chat migration remains pending.

Current status: the first local Android development build installed and launched successfully on a connected physical device. The login and sign-up screens render correctly. The prior Windows CMake object-path issue was addressed by relocating the app to a shorter path and using pnpm's hoisted node-modules layout.

The user has reviewed the Design System preview and preferred-name behavior on an Android device. The brand artwork, controls, settings rows, switches, and name flow work as expected. This review does not cover the full accessibility or device matrix.

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
- [ ] Migrate onboarding: welcome → sign-in → preferred name → conversation style → first chat. Welcome, password authentication, preferred name, and style completion are implemented; style device review and first-chat routing remain.
- [ ] Connect onboarding state and persistence after checking the existing auth and backend contracts. Prototype actions are simulations, not implemented services.
- [ ] Migrate chat to the approved bubbles, supplied profile pictures, filled blue reactions, composer, and recovery states while preserving send/retry behavior.
- [ ] Build the approved settings screens and persist the appearance preference. Current theme preferences live in memory.

Validation completed for the shared UI: TypeScript, ESLint, brand geometry/logo checks, light/dark rendered accessibility checks, and an Android development bundle export. These checks do not replace native interaction or screen-reader testing.

Next implementation pass: milestone 5 device/live-API verification, including onboarding resume, recovery, and Android Back. Keep the development preview available during screen migration. Conversation screens still use their earlier UI.

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

## API v2 migration: foundation verification (2026-09-26)

Local verification passed; live API and Android verification remain incomplete.

- [x] Run 66 regression tests, full TypeScript, full-project ESLint with zero warnings, brand checks, and rendered light/dark control checks.
- [x] Verify matching OpenAPI hashes, v2 endpoint usage, rejected conversationId chat input, and development-only preview guards.
- [x] Fix native AbortSignal incompatibility and static Expo environment references; add regressions against installed native/Expo implementations.
- [x] Fix lint scope and add the repeatable, fail-fast pnpm verify:foundation command.

## Welcome and password authentication UI (2026-09-26)

- [x] Add the signed-out Welcome route and direct signed-out app launches to it.
- [x] Reuse the approved welcome gradient, Luni artwork, theme tokens, Button, IconButton, and TextField controls.
- [x] Redesign password sign-in and sign-up with keyboard-safe scrolling, field focus order, loading states, accessible errors, and retained form values.
- [x] Preserve Supabase password authentication and handle both immediate-session and email-confirmation sign-up results.
- [x] Keep Google, Apple, and email-link prototype simulations out of the production authentication flow.

Verification: the 66-test foundation suite, full TypeScript, full-project ESLint, brand checks, shared-control light/dark checks, and diff whitespace checks passed. Android bundle and device interaction checks were not run in this step.

## Authenticated handoff (2026-09-28)

- [x] Gate the root navigator until Supabase finishes its initial SecureStore session check.
- [x] Replace duplicate route-level spinners with one themed, accessible session-loading screen.
- [x] Centralize Welcome, sign-in, sign-up, and authenticated-entry destinations.
- [x] Route restored and newly created sessions through the same authenticated entry point without mounting auth and protected screens during restoration.
- [x] Send sessions that expire inside protected routes to password sign-in.
- [x] Recover from an unexpected session-storage failure instead of leaving the app on its loading screen.
- [x] Replace the transitional authenticated destination with the `/me` onboarding decision.

Verification: the 66-test foundation suite, full TypeScript, full-project ESLint, brand checks, shared-control light/dark checks, and diff whitespace checks passed. The handoff is verified from route and provider state; live password-auth, app-restart, and session-expiry interaction checks remain for Android device testing.

## Authentication accessibility and mobile behavior (2026-09-28)

- [x] Focus each authentication screen heading for active screen-reader users after route transitions, including the sign-up confirmation state.
- [x] Connect React Hook Form field refs so failed submissions focus the first invalid field while retaining the existing inline and live-region errors.
- [x] Make authentication back controls follow navigation history with a direct Welcome fallback for deep-linked screens.
- [x] Keep the status bar, Android navigation bar, and native root background in sync with the active light or dark theme.
- [x] Preserve keyboard-safe scrolling, input return-key order, safe-area coverage, minimum control sizes, and the development-only Design System preview.
- [ ] Complete manual TalkBack, larger-text, keyboard/small-screen, Android back, and wider Android/iOS device review.

Verification: targeted TypeScript and ESLint checks passed, and Expo resolved the navigation-bar plugin in the public app configuration. Native interaction and visual checks were left for manual review as requested.

## Preferred-name onboarding (2026-09-28)

- [x] Read `/me` at the authenticated entry and route profiles without a saved name to preferred-name setup.
- [x] Build the approved preferred-name screen with the shared brand artwork, theme, `TextField`, and `Button`.
- [x] Prefill a saved server name and validate trimmed names from 1 to 40 characters.
- [x] Save through `PATCH /me`, prevent duplicate submissions, retain input after failures, and expose retry and request-ID details.
- [x] Route a successful save to the conversation-style handoff. The next milestone will replace the handoff with the style selector.
- [x] Confirm the preferred-name behavior on an Android device.

Verification: regression tests, TypeScript, full-project ESLint, brand checks, and diff whitespace checks passed. The shared-control renderer reached an existing Node 24 limitation while loading TypeScript from `node_modules`; it did not report an application failure. The user completed the Android behavior check.

## Conversation-style onboarding: selector UI (2026-09-28)

- [x] Replace the style handoff with four single-select rows from the approved onboarding prototype.
- [x] Default the local selection to Warm and balanced and update the sample greeting when a style is selected.
- [x] Reuse ProfileScreen, brand artwork, typography, spacing, and light/dark theme tokens; add radio semantics, focus outlines, and a polite greeting announcement.
- [x] Step 2: initialize from the saved server style and add back navigation to preferred name.
- [x] Step 3: connect Start talking/Skip, profile saving, onboarding completion, and recovery states.

Verification: full TypeScript checking with native-package read access, targeted ESLint, and diff whitespace checks passed. Android visual/interaction, TalkBack, and larger-text review remain pending. Selection is local to this screen; this step makes no profile writes and does not complete onboarding. The development-only Design System preview is unchanged.

## Conversation-style onboarding: saved state and back navigation (2026-09-28)

- [x] Read the saved conversation style through useMyProfile and preselect it when profile data is available.
- [x] Show loading and retry states instead of briefly selecting an incorrect default; keep an edited selection during background profile refreshes.
- [x] Add an optional shared IconButton back control to ProfileScreen. On the style screen, both this control and focused Android Back return to preferred-name editing through route replacement, including direct entry.
- [x] Redirect profiles without a preferred name to the name screen. The existing name form prefills the saved name and returns to style after saving.

Verification: full TypeScript and targeted ESLint passed with native-package read access; all 12 existing query regression tests and diff whitespace checks passed. These query tests do not verify native screen interactions. Android back, saved-style display, loading/retry, and larger-text review remain pending. Style changes remain unsaved until step 3; leaving and reopening the screen restores the server value.

## Conversation-style onboarding: completion workflow (2026-09-28)

- [x] Start talking saves the selected style; Skip for now saves warm_balanced through the existing profile mutation hook.
- [x] Wait for the confirmed style save, then call bodyless onboarding completion. Return to the authenticated entry only after the server returns onboardingCompletedAt.
- [x] Disable choices, both actions, and the back control while submitting. Block repeated same-tick actions and Android Back during submission.
- [x] Retain the selected style and request-ID error details after failures. Retry saving after an unconfirmed save; retry only completion after a confirmed save. Saving a different choice invalidates the prior save checkpoint.
- [x] Stop the remaining workflow after unmount/account-change cleanup, preventing stale navigation or a new completion call after an abandoned save.
- [x] Add 13 workflow regression tests and include them in verify:foundation.

Verification: all 79 combined API, query, chat-retry, environment, and onboarding regression tests passed. Full TypeScript, targeted ESLint with zero warnings, and diff whitespace checks passed. No live API, Android interaction, or screenshot review ran in this step. Completion returns to the existing authenticated entry; the transitional conversation list remains until milestone 5. Step 4 is Android flow review and fixes.

## Continuous-chat entry: milestone 5, steps 1–3 (2026-09-28)

- [x] Replace the transitional conversation list at /(app) with the existing chat renderer and composer. Remove New chat and list navigation; redirect legacy new-chat and ID routes through the authenticated entry.
- [x] Move the server-profile guard into the authenticated layout so restored sessions and direct links follow the same name/style/completed decisions before chat mounts.
- [x] Keep preferred-name editing available during incomplete onboarding; redirect completed profiles away from onboarding.
- [x] Reuse companion history hooks for profile → bodyless companion PUT → messages GET. Render the saved server greeting/history without generating a local greeting.
- [x] Remove temporary conversation-list/detail hook adapters. Add three routing regression tests to the foundation command.
- [x] Implement milestone 5 recovery and protected back navigation (see steps 4–5 below). Native back-navigation review remains pending.
- [ ] Verify new/returning accounts, interrupted setup, direct links, and account switching against the live API on Android.

Verification: all 82 regression tests, full TypeScript with native-package read access, full-project ESLint, brand checks, and diff whitespace checks passed. Shared-control rendering remains blocked by the existing Node 24 ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING error for expo-navigation-bar. No Android bundle, live API, or native interaction test ran. The chat keeps its earlier appearance until milestone 6; the development-only Design System preview is unchanged.

## Continuous-chat entry: milestone 5, steps 4–5 (2026-09-28)

- [x] Add themed profile/chat loading messages and recovery screens using shared artwork, Button, TextField, and ProfileScreen.
- [x] Retry failed initialization/history reads without repeating profile writes or onboarding completion. Reload profile after onboarding conflicts; invalidate stale companion resolution after a missing-companion response.
- [x] Keep loaded history and the composer mounted during background network failures, with a refresh-retry banner.
- [x] Handle invalid/expired API sessions with same-account password recovery. Guard duplicate submits and abandoned recovery; a removed Supabase session still routes to password sign-in.
- [x] Show email-confirmation recovery separately from connection errors.
- [x] Use protected stack entries to remove completed onboarding and legacy chat routes from navigation history. Remove signed-out entry/auth routes while signed in. Preserve name/style navigation while setup is incomplete, including the existing Android Back submission guard.
- [x] Add query-failure/retry, available-route, error-classification, and password-recovery regression coverage.
- [ ] Complete physical Android tests for Back, keyboard, light/dark recovery screens, expired sessions, and live API failures. This is milestone 5 step 6.

Verification: 92 regression tests passed across the suite and targeted follow-up, full TypeScript and ESLint passed, brand checks passed, and Android Metro/Hermes export succeeded (1,653 modules). Shared-control rendering still encounters the documented Node 24 dependency type-stripping issue; no native screenshot or interaction review ran. The approved chat redesign remains milestone 6. The development-only Design System preview stays available.

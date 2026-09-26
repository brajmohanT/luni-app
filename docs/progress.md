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

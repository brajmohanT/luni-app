# Luni Mobile Tech Stack

Use this document to choose and maintain Luni's mobile technologies, boundaries, and adoption criteria.

Status: chosen for the text-chat MVP. Revisit a decision only when a product requirement makes it necessary.

## Product scope

Luni is a mobile AI companion. The first release is native-feeling text chat with onboarding, authentication, persisted conversations, long-term memory served by the backend, and a path to subscriptions. Android is the first test platform, followed by iOS. Voice is a later phase.

## Chosen stack

| Area | Choice | Why |
| --- | --- | --- |
| Mobile framework | Expo + React Native + TypeScript | Fast cross-platform delivery while retaining access to native capabilities when Luni needs them. |
| Development workflow | Expo development builds, not Expo Go | Required for production-like native modules and a reliable Android-first test path. |
| Package manager layout | pnpm with `nodeLinker: hoisted` | Keeps React Native native-module paths short and flattened for reliable Windows CMake/Android builds. |
| Navigation | Expo Router | File-based routes, deep-link support, and a conventional Expo structure. |
| Builds and updates | EAS Build and EAS Update | Managed Android/iOS builds and controlled over-the-air JavaScript updates. |
| Server data | TanStack Query | Fetching, caching, retries, loading states, and cache invalidation for conversations, profiles, and memories. |
| Local UI state | Zustand | Small, explicit stores for ephemeral UI state. Do not put server data here. |
| Forms and validation | React Hook Form + Zod + `@hookform/resolvers` | Typed, efficient mobile forms. The resolver connects the Zod schema to React Hook Form. Used for the implemented email/password authentication forms. |
| Auth token storage | expo-secure-store | Stores session credentials in platform secure storage. |
| Local database | expo-sqlite, before external beta | Store drafts, pending messages, and a recent-chat cache. The server remains the source of truth. |
| Chat rendering | FlashList, when the chat UI is implemented | Designed for efficient long, scrolling message lists. |
| Motion and gestures | react-native-reanimated + react-native-gesture-handler | Native-feeling transitions and interactions. Use them selectively. |
| Visual system | Custom Luni components built from React Native primitives | Luni needs an ownable companion identity; avoid letting a generic UI kit define the product. |
| Notifications | expo-notifications, later | Add after notification consent, retention rules, and user benefit are designed. |
| Crash reporting | Sentry, before public beta | Error reporting and release health. Do not attach private conversation content. |
| Product analytics | PostHog, before public beta | Privacy-conscious product events; never record raw messages, memories, or authentication data. |
| Subscriptions | RevenueCat, when paid plans begin | Mobile subscription handling across the App Store and Google Play. |

## Backend contract

The mobile app is a client of the existing server. It does not call OpenAI or the database directly.

The backend remains:

- Node.js and TypeScript
- Express API
- OpenAI Responses API
- Supabase Auth and Postgres
- Drizzle ORM
- Render deployment

This keeps API keys, memory extraction, memory retrieval, safety policies, billing checks, and personal data handling on the server.

## App boundaries

```text
Expo mobile app
  ├── Expo Router screens
  ├── TanStack Query: API data and cache
  ├── Zustand: temporary UI state
  └── Secure Store: auth session credentials
             │ HTTPS + bearer token
             ▼
Existing Luni API
  ├── Auth, chat, conversations
  ├── Memory and personalization
  └── Postgres, OpenAI, safety controls
```

## Local Android build constraint

Windows CMake builds can exceed their object-path limit when pnpm's isolated layout adds long `.pnpm` package paths to native dependencies such as `react-native-worklets`. Keep the repository at a short local path and retain `nodeLinker: hoisted` in `pnpm-workspace.yaml`. After changing that setting, reinstall dependencies and clear generated Android build artifacts before rebuilding.

## Deliberately not choosing yet

- Redux Toolkit: Zustand plus TanStack Query is sufficient for the MVP.
- GraphQL: the current API is simple and workflow-oriented.
- Firebase or Convex: the existing Node, Supabase, and Postgres architecture fits server-owned memory and safety work better.
- MMKV: measure a real local-storage performance problem before adding it.
- A large UI component library: custom components are the better product fit now.
- A vector database SaaS: begin memory in Postgres. Consider `pgvector` only after evaluation shows semantic retrieval improves memory quality.
- Voice-agent platforms: revisit during the voice phase, after the text product proves demand.

## Deferred decisions and adoption triggers

| Decision | Adopt when |
| --- | --- |
| FlashList | Profiling shows that the message list misses frame-time targets. |
| Notifications | The team defines consent timing, private payload rules, token handling, and deep-link fallback. |
| RevenueCat | Paid plans have product and support flows. Verify webhook HMAC, deduplicate events, and sync entitlements on the API. |
| `pgvector` | Retrieval evaluation shows that semantic search improves memory quality. |
| Voice platform or native modules | Voice or device requirements exceed Expo's supported APIs. |
| Wider device test matrix | Crash reports or customer traffic show device- or OS-specific failures. |

## Suggested repository layout

```text
luni-fullstack/
  luni-app/                 # Expo mobile client
    docs/
      tech-stack.md
  luni/                     # Existing Node/TypeScript API
  packages/
    contracts/              # Shared API types and Zod schemas
```

## Reference

- Simon Grimm, [Choosing the Right React Native Stack in 2026](https://www.youtube.com/watch?v=LZFEr9QDIVg), accessed 2026-09-14. The video informed the Expo, local-data, state-management, services, backend, and UI-library review. Luni adopts its lean-stack principle, rather than every recommendation.

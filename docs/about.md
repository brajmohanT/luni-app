# Luni project brief for agents

Agents may read and update this document. Keep it accurate as the team builds the product. Record facts supported by the repository or confirmed by the user. Do not replace human-authored product decisions with assumptions.

## Product

Luni is a mobile AI companion. The first release centers on text chat, authentication, persisted conversations, and user-controlled long-term memory. The team plans voice input and output for a future release.

Android is the first test platform, followed by iOS.

## Current repository state

This `luni-app` directory contains an initialized Expo application and project documentation. The app has TypeScript, Expo Router, TanStack Query, SecureStore, a versioned SQLite persistence foundation, and a Supabase session provider with protected auth and app route groups. Email/password sign-in and sign-up forms use React Hook Form and Zod, and persist Supabase sessions in SecureStore. EAS development builds, mobile deep-link completion flows, and Luni API integration are not configured yet.

## Architecture

The mobile client will use Expo, React Native, and TypeScript. It will call the existing Luni API over HTTPS with a bearer token. The mobile client must not call OpenAI or the database directly.

The backend already exists outside this directory. It uses Node.js, TypeScript, Express, Supabase Auth, managed Postgres, Drizzle ORM, the OpenAI Responses API, and Render deployment.

The backend owns authentication, conversations, AI generation, memory extraction and retrieval, safety policy, billing checks, and personal-data handling. The client owns screens, navigation, local drafts and recent-chat cache, message UI state, and secure token storage.

## Planned mobile stack

- Expo development builds, Expo Router, EAS Build, and EAS Update
- TanStack Query for server data
- Zustand for temporary UI state
- React Hook Form and Zod for forms and validation
- `expo-secure-store` for session credentials
- `expo-sqlite` for drafts, pending messages, and recent chat before external beta

## Delivery priorities

1. Create shared Zod API contracts and backend test coverage.
2. Create the Expo app and connect Supabase authentication to the Luni API.
3. Build reliable chat with streaming, idempotency, retries, drafts, and app-restart recovery.
4. Add memory review, correction, deletion, disable, export, and account-deletion flows.
5. Add release controls, privacy-safe monitoring, analytics, and test coverage before external beta.

## Working rules

- Treat the server as the source of truth for conversations and memory.
- Keep private conversation content out of analytics, crash reports, and lock-screen notification text.
- Update this brief when implementation or confirmed decisions change.

See [index.md](index.md) for the human-authored overview, [progress.md](progress.md) for delivery status, [tech-stack.md](tech-stack.md) for technology decisions, and [mobile-app-practices.md](mobile-app-practices.md) for implementation requirements.

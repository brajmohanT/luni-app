# Authentication and protected routing

This flow documents the current Expo Router and Supabase session behaviour. It does not include the email-confirmation deep link, which remains unimplemented.

```mermaid
flowchart TD
  launch[App launches] --> providers[AppProviders]
  providers --> auth[AuthProvider restores session from SecureStore]
  auth --> loading{Session restoration complete?}
  loading -- No --> spinner[Show loading screen]
  spinner --> loading
  loading -- Yes --> session{Supabase session exists?}

  session -- No --> authRoutes[Auth route group]
  authRoutes --> signIn[Sign-in screen]
  authRoutes --> signUp[Sign-up screen]

  signIn --> credentials[Validate email and password]
  credentials --> signInRequest[Supabase signInWithPassword]
  signInRequest --> signInFailure{Success?}
  signInFailure -- No --> signInError[Show form error]
  signInFailure -- Yes --> persist[Supabase persists session in SecureStore]

  signUp --> signUpValidation[Validate email, password, and confirmation]
  signUpValidation --> signUpRequest[Supabase signUp]
  signUpRequest --> signUpResult{Session returned?}
  signUpResult -- No --> confirmation[Show email-confirmation message]
  signUpResult -- Yes --> persist

  persist --> authEvent[Supabase auth-state event]
  authEvent --> appRoutes[Protected app route group]

  session -- Yes --> appRoutes
  appRoutes --> appScreen[Conversation screens]

  appRoutes --> missingSession{Session removed?}
  missingSession -- Yes --> authRoutes
```

## Route guard rules

- `src/app/index.tsx` redirects to `/(app)` when a session exists, otherwise to `/(auth)/sign-in`.
- `src/app/(app)/_layout.tsx` redirects unauthenticated users to sign-in.
- `src/app/(auth)/_layout.tsx` redirects authenticated users to `/(app)`.
- `AuthProvider` listens for Supabase auth-state changes, so route guards react after sign-in, sign-up with a session, or sign-out.
- Supabase stores the session through the SecureStore adapter in `src/lib/auth/secure-storage.ts`.

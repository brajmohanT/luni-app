# Authentication and protected routing

This flow documents the current Expo Router and Supabase session behaviour. It does not include the email-confirmation deep link, which remains unimplemented.

```mermaid
flowchart TD
  launch[App launches] --> providers[AppProviders]
  providers --> auth[AuthProvider restores session from SecureStore]
  auth --> loading{Session restoration complete?}
  loading -- No --> spinner[Root navigator shows the themed session-loading screen]
  spinner --> loading
  loading -- Yes --> session{Supabase session exists?}

  session -- No --> welcome[Welcome screen]
  welcome --> authRoutes[Auth route group]
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
  authEvent --> handoff[Authenticated entry route]
  handoff --> appRoutes[Protected app route group]

  session -- Yes --> handoff
  appRoutes --> profile[GET /me]
  profile --> profileLoaded{Profile loaded?}
  profileLoaded -- No --> profileRetry[Show retry without leaving protected routes]
  profileRetry --> profile
  profileLoaded -- Yes --> hasName{Preferred name saved?}
  hasName -- No --> name[Preferred-name screen]
  name --> saveName[PATCH /me]
  saveName --> style[Conversation-style screen]
  hasName -- Yes --> onboardingComplete{Onboarding complete?}
  onboardingComplete -- No --> style
  onboardingComplete -- Yes --> companion[PUT /conversations/companion]
  companion --> history[GET /conversations/companion/messages]
  history --> appScreen[Continuous chat with server greeting and history]

  appRoutes --> missingSession{Session removed?}
  missingSession -- Yes --> authRoutes
```

## Route guard rules

- `src/app/_layout.tsx` holds the navigator until the initial Supabase session check finishes. Route screens do not mount behind the loading surface.
- `src/app/index.tsx` redirects to the authenticated entry route when a session exists, otherwise to Welcome.
- `src/app/(app)/_layout.tsx` redirects a user whose session expires to sign-in.
- `src/app/(auth)/_layout.tsx` sends an authenticated user through the same authenticated entry route used at launch.
- `src/features/auth/routes.ts` owns these destinations. The authenticated layout reads `/me` before mounting protected screens, sends profiles without a name to `/(app)/onboarding/name`, and sends incomplete profiles with a name to `/(app)/onboarding/style`.
- Preferred-name setup validates a trimmed 1–40 character value, saves it through `PATCH /me`, and retains the entered value when saving fails.
- `AuthProvider` listens for Supabase auth-state changes, so route guards react after sign-in, sign-up with a session, or sign-out.
- Supabase stores the session through the SecureStore adapter in `src/lib/auth/secure-storage.ts`.

## Development preview exception

The root layout exposes `/design-system` through `Stack.Protected` with a `__DEV__` guard. The screen also redirects to `/` outside development. It sits outside the auth/app route groups, so developers can open it before or after sign-in using **Open Design System · Dev**.

The preview uses local sample data and an isolated ThemeProvider. It does not grant access to authenticated feature screens or change session state. Close it to return to the previous screen. Production builds have no preview launcher or route access.

Welcome, password authentication, and preferred-name setup use the approved design system. Conversation style and onboarding completion are the next UI integration work.

Completed profiles open continuous chat at `/(app)`. Legacy new-chat and conversation-ID links redirect through this entry. The layout also guards direct onboarding links, while incomplete profiles can return from style to edit their saved name. Chat uses the existing account-scoped companion/history query sequence.

## Entry recovery and navigation history

The authenticated layout loads the profile before mounting its stack. Its index route selects name, style, or continuous chat. Protected stack entries remove onboarding screens once the saved profile confirms completion, and exclude legacy chat routes. Root guards remove Welcome/password-auth history while signed in. The name and style screens remain available while setup is incomplete.

Profile and chat loading use themed status screens. Entry failures offer retry and request details; API session errors use same-account password recovery before retrying the read. Missing Supabase sessions route to password sign-in. Network errors during a background history refresh retain loaded messages and the composer. Initialization retries never repeat onboarding writes.

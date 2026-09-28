export const authRoutes = {
  authenticated: '/(app)',
  conversationStyle: '/(app)/onboarding/style',
  preferredName: '/(app)/onboarding/name',
  signIn: '/(auth)/sign-in',
  signUp: '/(auth)/sign-up',
  welcome: '/(auth)/welcome',
} as const;

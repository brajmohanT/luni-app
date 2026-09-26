type PublicEnvironmentKey =
  | 'EXPO_PUBLIC_API_URL'
  | 'EXPO_PUBLIC_SUPABASE_URL'
  | 'EXPO_PUBLIC_SUPABASE_KEY';

function requirePublicEnvironment(key: PublicEnvironmentKey, input: string | undefined) {
  const value = input?.trim();
  if (!value) {
    throw new Error(`Missing ${key}. Add it to .env.local before starting the app.`);
  }
  return value;
}

// Expo's transformer requires statically named public environment references.
export const env = {
  apiUrl: requirePublicEnvironment('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL).replace(/\/+$/, ''),
  supabaseUrl: requirePublicEnvironment('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseKey: requirePublicEnvironment('EXPO_PUBLIC_SUPABASE_KEY', process.env.EXPO_PUBLIC_SUPABASE_KEY),
} as const;

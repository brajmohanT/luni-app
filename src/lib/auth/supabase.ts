import { createClient } from '@supabase/supabase-js';

import { env } from '@/lib/config/env';
import { secureStorage } from '@/lib/auth/secure-storage';

export const supabase = createClient(env.supabaseUrl, env.supabaseKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
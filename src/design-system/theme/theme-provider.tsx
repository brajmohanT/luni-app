import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { resolveThemeMode, themes, type Theme, type ThemePreference } from './theme';

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialPreference = 'system',
  onPreferenceChange,
}: PropsWithChildren<{
  initialPreference?: ThemePreference;
  onPreferenceChange?: (preference: ThemePreference) => Promise<void> | void;
}>) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  const setPreference = useCallback(async (nextPreference: ThemePreference) => {
    await onPreferenceChange?.(nextPreference);
    setPreferenceState(nextPreference);
  }, [onPreferenceChange]);
  const mode = resolveThemeMode(preference, systemScheme);
  const value = useMemo(
    () => ({ theme: themes[mode], preference, setPreference }),
    [mode, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider.');
  return context;
}

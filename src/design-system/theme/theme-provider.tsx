import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { resolveThemeMode, themes, type Theme, type ThemePreference } from './theme';

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialPreference = 'system',
}: PropsWithChildren<{ initialPreference?: ThemePreference }>) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);
  const mode = resolveThemeMode(preference, systemScheme);
  const value = useMemo(
    () => ({ theme: themes[mode], preference, setPreference }),
    [mode, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider.');
  return context;
}

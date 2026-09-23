import { colors, motion, radii, sizing, spacing, typography, type ThemeColors } from '../tokens';

export type ThemeMode = 'light' | 'dark';
export type ThemePreference = ThemeMode | 'system';

export type Theme = {
  mode: ThemeMode;
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  sizing: typeof sizing;
  radii: typeof radii;
  motion: typeof motion;
};

const shared = { typography, spacing, sizing, radii, motion };

export const themes: Record<ThemeMode, Theme> = {
  light: { ...shared, mode: 'light', colors: colors.light },
  dark: { ...shared, mode: 'dark', colors: colors.dark },
};

export function resolveThemeMode(
  preference: ThemePreference,
  systemScheme: string | null | undefined,
): ThemeMode {
  return preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
}

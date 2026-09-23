# Luni design system

Source: `docs/design/index.html`, its system specimen, and current onboarding,
chat, and settings prototypes. Start new controls with these tokens.

`tokens/` holds colors, typography, spacing, sizing, radii, and motion.
`theme/` provides light/dark/system preference through `ThemeProvider` and
`useTheme()`. `AppProviders` mounts the provider. System mode follows device
changes and falls back to light when the OS reports no preference.

```tsx
import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTheme, type Theme } from '@/design-system/theme';

function Label() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <Text style={styles.label}>Message</Text>;
}

const createStyles = (theme: Theme) => StyleSheet.create({
  label: { ...theme.typography.label, color: theme.colors.text },
});
```

Call `setPreference('light' | 'dark' | 'system')` from appearance controls.
Preference lives in memory for this foundation pass; persistence and the
settings control remain feature work. `initialPreference` applies on mount.
Existing screens retain their styles until migration, including navigation
and status bars. The provider does not change global native appearance.

Use `colors.reaction` for filled blue reaction icons in both modes; `focus`
is a separate color. Use `settingsBorder` for the stronger dark settings
separator. Preserve the supplied logo and profile photos during migration.

Font family remains provisional; typography uses the platform default.
Keep text scaling enabled, use minimum control heights, and calculate composer
height from scaled line height. Motion defaults to zero because the approved
prototypes do not specify animation timing.

Add reusable accessible controls under `components/` as screens migrate.
Keep chat/settings behavior and business logic under `src/features/`.

## Brand artwork

Use `BrandBackground` for brand moments and `LuniLogo` for the supplied white
mark. The `identity` background matches the layered gradient and seeded grain
in the system specimen. The `welcome` background matches onboarding and has
no grain. Both retain their colors in light and dark mode.

```tsx
import { BrandBackground, LuniLogo } from '@/design-system/components';

<BrandBackground variant="welcome" style={styles.welcomeArt}>
  <LuniLogo size={70} />
</BrandBackground>

// In your StyleSheet.create:
// welcomeArt: { height: 190, borderRadius: 20,
//   alignItems: 'center', justifyContent: 'center' }
```

Give the background a height or content that establishes its size. The artwork
resizes to its container; it does not capture touches or hide child controls
from accessibility. Mark the logo `decorative` when adjacent text already
identifies Luni. Its default accessible label is “Luni”. Use the white mark on
blue or dark surfaces, preserve its proportions, and do not recolor it.

`tokens/brand.ts` holds CSS angles, gradient stops, and ellipse centers.
`assets/brand/luni-logo.svg` preserves the supplied source artwork;
`src/design-system/assets/luni-logo.ts` contains the same paths for native SVG.
`assets/brand/grain.png` reproduces the specimen's 600 × 600 seeded noise
(seed 13, multiplier 16807, modulus 2147483647, alpha 200), composited with
soft-light at 13% opacity. Texture blending requires the New Architecture.

The components use Expo-compatible `react-native-svg`. Rebuild an existing
development client after adding the native dependency. Screen adoption remains
a separate migration; chat colors and existing feature behavior stay intact.

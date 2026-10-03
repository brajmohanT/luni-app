# Luni design system

Source: `docs/design/index.html`, its system specimen, and current onboarding,
chat, and settings prototypes. Start new controls with these tokens.

Status (2026-09-23): foundations, brand artwork, and the first shared controls
are implemented. The user reviewed the development preview on Android and
approved its appearance. Onboarding migration is next; product screens retain
their earlier UI. Track remaining work in [mobile progress](../../docs/progress.md).

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

Call and await `setPreference('light' | 'dark' | 'system')` from appearance
controls. The app provider reads the device-wide preference from SQLite before
mounting the theme and persists a new value before applying it. A nested
`ThemeProvider` without `onPreferenceChange`, such as the development preview,
keeps its preference local. `initialPreference` applies on mount. `SystemBars`
keeps the status bar, Android navigation bar, and native root background aligned
with the resolved theme.

Use `colors.reaction` for filled blue reaction icons in both modes; `focus`
is a separate color. Use `settingsBorder` for the stronger dark settings
separator. Preserve the approved connection mark and profile photos during
migration.

Font family remains provisional; typography uses the platform default.
Keep text scaling enabled, use minimum control heights, and calculate composer
height from scaled line height. Motion defaults to zero because the approved
prototypes do not specify animation timing.

Button, IconButton, TextField, SettingsRow, and Switch are available under
`components/`. Add further reusable controls as screens migrate.
Keep chat/settings behavior and business logic under `src/features/`.

## Brand artwork

Use `BrandBackground` for brand moments and `LuniLogo` for the approved white
connection mark. The `identity` background matches the layered gradient and
seeded grain in the system specimen. The `welcome` background matches
onboarding and has no grain. Both retain their colors in light and dark mode.

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
`assets/brand/luni-logo.svg` is the canonical source artwork;
`src/design-system/assets/luni-logo.ts` contains the same geometry for native SVG.
`scripts/generate-brand-assets.ps1` creates the launcher, adaptive, monochrome,
splash, and favicon PNGs from that geometry using the approved deep teal.
`assets/brand/grain.png` reproduces the specimen's 600 × 600 seeded noise
(seed 13, multiplier 16807, modulus 2147483647, alpha 200), composited with
soft-light at 13% opacity. Texture blending requires the New Architecture.

The components use Expo-compatible `react-native-svg`. Rebuild an existing
development client after adding the native dependency. Screen adoption remains
a separate migration; chat colors and existing feature behavior stay intact.

## Shared controls

Use these controls inside `ThemeProvider`. They follow the approved control
specimen, with 44-point minimum button targets, pill buttons, and labeled fields.

```tsx
import { Button, IconButton, TextField } from '@/design-system/components';

<Button onPress={save} loading={isSaving} loadingLabel="Saving…">Save</Button>
<Button variant="outlined" onPress={cancel}>Cancel</Button>
<Button variant="destructive" onPress={confirmRemoval}>Delete account</Button>

<IconButton
  accessibilityLabel="Close"
  onPress={close}
  icon={({ color, size }) => <CloseIcon color={color} size={size} />}
/>

<TextField
  ref={emailRef}
  label="Email"
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  autoCapitalize="none"
  autoComplete="email"
  helperText="Use your email address."
  errorText={emailError}
/>
```

`CloseIcon` represents your vector icon component. IconButton supplies its size
and theme color, and hides the decorative icon from accessibility. Give each
icon button an action label. Both button types support `loading`, `disabled`,
and the three variants. Loading blocks presses and exposes a busy state.

TextField accepts native TextInput props and a forwarded ref for form libraries.
`style` applies to its input; `containerStyle` applies to the labeled group.
`errorText` replaces helper text without changing the value. Web inputs reference
their visible message; native inputs include it in the accessibility hint.
Android announces changing errors through a polite live region. Check error
announcements with VoiceOver when integrating a form.

Controls retain font scaling, let labels wrap, and expose focus outlines. Parent
layouts must leave room for the outlines and larger text. `readOnly` preserves
the normal appearance; `disabled` uses muted text and blocks editing.

Run `node scripts/check-controls.cjs` to check rendered accessibility semantics
in both themes and generate `.expo/controls-preview.html` for visual review.
The preview uses the real components through React Native Web; it is static.
Native interaction, keyboard, and screen-reader checks belong to screen integration.

## Android development preview

In a development build, tap **Open Design System · Dev** at the top of any
regular screen. The `/design-system` screen includes both brand backgrounds,
the logo, all button variants, loading/disabled examples, and text fields.
Switch light/dark/system appearance within the preview. Its nested theme
provider keeps those choices separate from the persisted app preference.

Tap **Try loading state** for a simulated save, or **Check email** to test an
error without losing your input. All actions use local sample data. Close the
preview with its close button or Android Back. The launcher and route access
are disabled in production builds.

## Settings rows and switches

```tsx
<SettingsRow kind="navigation" label="Appearance" value="System" onPress={openAppearance} />
<SettingsRow kind="toggle" label="Reminders" description="A daily check-in"
  value={reminders} onValueChange={setReminders} />
<SettingsRow kind="info" label="Version" value="1.0.0" />
<Switch accessibilityLabel="Reminders" value={reminders} onValueChange={setReminders} />
```

Navigation rows have chevrons and a button role. Info rows have no press action.
Toggle rows contain one switch control, without a nested pressable row. Switches
require a label and expose checked/disabled states. Both components accept
`disabled`, `style`, and `testID`.

Switches are controlled: update the value in `onValueChange`. Their 48 × 28 track,
white thumb, and solid blue on-state match the approved specimen. The hit target
is at least 44 points high. State changes have no animation, and the thumb follows
layout direction. Rows use minimum heights so larger text can wrap.

In the Android preview, scroll to **Settings rows**. Tap Appearance to reveal
theme choices, toggle sample reminders, and inspect disabled and long-text rows.
Standalone on/off switches follow that section. These examples do not save
settings or request notification permission.

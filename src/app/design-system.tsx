import { Redirect, Stack } from 'expo-router';

import { ThemeProvider } from '@/design-system/theme';
import { DesignSystemPreview } from '@/features/development/design-system-preview';

export default function DesignSystemScreen() {
  if (!__DEV__) return <Redirect href="/" />;

  return (
    <ThemeProvider>
      <Stack.Screen options={{ headerShown: false }} />
      <DesignSystemPreview />
    </ThemeProvider>
  );
}

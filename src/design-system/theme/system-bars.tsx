import { useEffect } from 'react';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';

import { useTheme } from './theme-provider';

export function SystemBars() {
  const { theme } = useTheme();
  const contentStyle = theme.mode === 'dark' ? 'light' : 'dark';

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.colors.canvas);
  }, [theme.colors.canvas]);

  return (
    <>
      <StatusBar animated style={contentStyle} />
      <NavigationBar style={contentStyle} />
    </>
  );
}

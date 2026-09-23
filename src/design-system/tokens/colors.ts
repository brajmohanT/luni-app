// Approved foundations: docs/design/system/design-system.html.
export const palette = {
  black: '#000000',
  white: '#FFFFFF',
  deep: '#284550',
  chatBlue: '#0054FD',
  richBlue: '#3163C5',
  midBlue: '#386DCE',
  sky: '#75AEEA',
  ice: '#ADD0F2',
  iceWhite: '#F6FAFE',
} as const;

export type ThemeColors = {
  canvas: string;
  surface: string;
  composer: string;
  border: string;
  settingsBorder: string;
  controlBorder: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  incomingBubble: string;
  outgoingBubble: string;
  reaction: string;
  focus: string;
  danger: string;
  scrim: string;
};

const shared = {
  primary: palette.chatBlue,
  onPrimary: palette.white,
  outgoingBubble: palette.chatBlue,
  reaction: palette.chatBlue,
  scrim: 'rgba(0, 0, 0, 0.6)',
};

export const colors = {
  light: {
    ...shared,
    canvas: '#F9FBFD',
    surface: '#ECEEF2',
    incomingBubble: '#ECEEF2',
    composer: '#F1F3F6',
    border: '#E0E2E8',
    settingsBorder: '#E0E2E8',
    controlBorder: '#858B96',
    text: '#111318',
    textMuted: '#596171',
    focus: palette.chatBlue,
    danger: '#B42318',
  },
  dark: {
    ...shared,
    canvas: '#060709',
    surface: '#282A30',
    incomingBubble: '#282A30',
    composer: '#141619',
    border: '#1F2128',
    // Settings prototype uses a stronger separator than the chat specimen.
    settingsBorder: '#30333B',
    controlBorder: '#767D89',
    text: '#F7F8FA',
    textMuted: '#ADB3BE',
    focus: palette.sky,
    danger: '#FFB4AB',
  },
} as const satisfies Record<'light' | 'dark', ThemeColors>;

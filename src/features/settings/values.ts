import type { ThemePreference } from '@/design-system/theme';
import type { ConversationStyle } from '@/lib/api/types';

export const styleLabels: Record<ConversationStyle, string> = {
  warm_balanced: 'Warm and balanced',
  gentle_reassuring: 'Gentle and reassuring',
  playful_casual: 'Playful and casual',
  direct_thoughtful: 'Direct and thoughtful',
};

export function appearanceLabel(value: ThemePreference) {
  return value === 'system' ? 'System' : value === 'dark' ? 'Dark' : 'Light';
}

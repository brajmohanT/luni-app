import type { ReactNode } from 'react';

import { useTheme } from '../theme';
import { ActionControl, type ActionControlProps } from './action-control';

export type IconButtonProps = Omit<ActionControlProps, 'children' | 'iconOnly' | 'accessibilityLabel'> & {
  accessibilityLabel: string;
  icon: (props: { color: string; size: number }) => ReactNode;
};

/** Supply vector artwork; this control owns its label, focus, and touch target. */
export function IconButton({ icon, variant = 'outlined', ...props }: IconButtonProps) {
  const { theme } = useTheme();
  return (
    <ActionControl {...props} variant={variant} iconOnly>
      {color => icon({ color, size: theme.sizing.icon })}
    </ActionControl>
  );
}

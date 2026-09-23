import { StyleSheet, Text } from 'react-native';

import { useTheme } from '../theme';
import { ActionControl, type ActionControlProps } from './action-control';

export type ButtonProps = Omit<ActionControlProps, 'children' | 'iconOnly'> & {
  children: string;
  loadingLabel?: string;
};

export function Button({ children, loadingLabel, loading, accessibilityLabel, ...props }: ButtonProps) {
  const { theme } = useTheme();
  const label = loading && loadingLabel ? loadingLabel : children;
  return (
    <ActionControl {...props} loading={loading} accessibilityLabel={accessibilityLabel ?? label}>
      {color => <Text style={[theme.typography.button, styles.label, { color }]}>{label}</Text>}
    </ActionControl>
  );
}

const styles = StyleSheet.create({ label: { flexShrink: 1, textAlign: 'center' } });

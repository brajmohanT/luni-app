import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { luniLogo } from '../assets/luni-logo';

export type LuniLogoProps = {
  size?: number;
  decorative?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Canonical white connection mark. Place on blue or dark brand surfaces. */
export function LuniLogo({ size = 70, decorative = false, accessibilityLabel = 'Luni', style }: LuniLogoProps) {
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      style={[styles.container, { width: size, height: size }, style]}>
      <Svg width="100%" height="100%" viewBox={luniLogo.viewBox} preserveAspectRatio="xMidYMid meet" accessible={false}>
        <Circle {...luniLogo.head} fill={luniLogo.fill} />
        <Circle
          cx={luniLogo.presence.cx}
          cy={luniLogo.presence.cy}
          r={luniLogo.presence.r}
          fill="none"
          stroke={luniLogo.fill}
          strokeWidth={luniLogo.presence.strokeWidth}
        />
        <Path
          d={luniLogo.connection.d}
          fill="none"
          stroke={luniLogo.fill}
          strokeWidth={luniLogo.connection.strokeWidth}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flexShrink: 0 } });

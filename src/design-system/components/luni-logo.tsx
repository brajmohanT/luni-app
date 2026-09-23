import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { luniLogo } from '../assets/luni-logo';

export type LuniLogoProps = {
  size?: number;
  decorative?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** Supplied white mark. Place on blue or dark surfaces; never recolor the paths. */
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
        {luniLogo.paths.map((path, index) => <Path key={index} d={path} fill={luniLogo.fill} />)}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flexShrink: 0 } });

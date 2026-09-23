import { useId, useState } from 'react';
import { Image, StyleSheet, View, type ViewProps } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { brandGradients, brandTexture, type BrandBackgroundVariant, type GradientStop } from '../tokens/brand';
import { linearGradientPoints, radialGradientEllipse } from './brand-gradient-geometry';

export type BrandBackgroundProps = ViewProps & {
  variant?: BrandBackgroundVariant;
};

function stops(values: readonly GradientStop[]) {
  return values.map((stop, index) => (
    <Stop key={index} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity ?? 1} />
  ));
}

/** Decorative brand artwork; children keep their own accessibility semantics. */
export function BrandBackground({
  variant = 'identity', children, style, onLayout, ...props
}: BrandBackgroundProps) {
  const id = `luni-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const [size, setSize] = useState({ width: 0, height: 0 });
  const gradient = brandGradients[variant];

  return (
    <View
      {...props}
      style={[styles.container, { backgroundColor: gradient.stops[0].color }, style]}
      onLayout={event => {
        const { width, height } = event.nativeEvent.layout;
        setSize(current => current.width === width && current.height === height ? current : { width, height });
        onLayout?.(event);
      }}>
      <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
        {size.width > 0 && size.height > 0 && (
          <Svg width={size.width} height={size.height} accessible={false}>
            <Defs>
              <LinearGradient id={`${id}-base`} gradientUnits="userSpaceOnUse" {...linearGradientPoints(size.width, size.height, gradient.angle)}>
                {stops(gradient.stops)}
              </LinearGradient>
              {gradient.overlays.map((overlay, index) => {
                const { cx, cy, rx, ry } = radialGradientEllipse(size.width, size.height, overlay.center);
                return (
                  <RadialGradient
                    key={index}
                    id={`${id}-${index}`}
                    gradientUnits="userSpaceOnUse"
                    cx={0} cy={0} fx={0} fy={0} r={1}
                    gradientTransform={[rx, 0, 0, ry, cx, cy]}>
                    {stops(overlay.stops)}
                  </RadialGradient>
                );
              })}
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#${id}-base)`} />
            {gradient.overlays.map((_, index) => (
              <Rect key={index} width="100%" height="100%" fill={`url(#${id}-${index})`} />
            ))}
          </Svg>
        )}
        {variant === 'identity' && <View style={styles.texture}>
          <Image source={require('@/assets/brand/grain.png')} resizeMode="stretch" style={StyleSheet.absoluteFill} accessible={false} />
        </View>}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', isolation: 'isolate' },
  texture: { ...StyleSheet.absoluteFill, opacity: brandTexture.opacity, mixBlendMode: brandTexture.blendMode },
});

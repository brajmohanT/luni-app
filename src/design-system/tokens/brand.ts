import { palette } from './colors';

export type GradientStop = { offset: number; color: string; opacity?: number };
export type BrandGradient = {
  angle: number;
  stops: readonly GradientStop[];
  overlays: readonly {
    center: readonly [number, number];
    stops: readonly GradientStop[];
  }[];
};

// CSS angles and normalized positions copied from the approved HTML.
// Overlays are in paint order, from back to front.
export const brandGradients = {
  identity: {
    angle: 125,
    stops: [
      { offset: 0, color: '#14292F' },
      { offset: 0.26, color: palette.deep },
      { offset: 0.9, color: palette.sky },
    ],
    overlays: [
      {
        center: [0.7, 0.2],
        stops: [
          { offset: 0, color: palette.richBlue },
          { offset: 0.25, color: palette.midBlue },
          { offset: 0.66, color: palette.midBlue, opacity: 0 },
        ],
      },
      {
        center: [0.98, 0.95],
        stops: [
          { offset: 0, color: palette.iceWhite },
          { offset: 0.21, color: palette.ice },
          { offset: 0.49, color: palette.ice, opacity: 0 },
        ],
      },
    ],
  },
  welcome: {
    angle: 130,
    stops: [
      { offset: 0, color: '#091323' },
      { offset: 1, color: palette.chatBlue },
    ],
    overlays: [{
      center: [0.9, 1],
      stops: [
        { offset: 0, color: palette.sky },
        { offset: 0.65, color: palette.sky, opacity: 0 },
      ],
    }],
  },
} as const satisfies Record<string, BrandGradient>;

export type BrandBackgroundVariant = keyof typeof brandGradients;

export const brandTexture = {
  opacity: 0.13,
  blendMode: 'soft-light',
} as const;

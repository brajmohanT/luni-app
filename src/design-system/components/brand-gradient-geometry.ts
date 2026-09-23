// Convert CSS gradient geometry to SVG user-space coordinates. This preserves
// the CSS angle and farthest-corner ellipses when the container changes shape.
export function linearGradientPoints(width: number, height: number, angle: number) {
  const radians = angle * Math.PI / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const halfLength = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
  return {
    x1: width / 2 - dx * halfLength,
    y1: height / 2 - dy * halfLength,
    x2: width / 2 + dx * halfLength,
    y2: height / 2 + dy * halfLength,
  };
}

export function radialGradientEllipse(width: number, height: number, center: readonly [number, number]) {
  const cx = width * center[0];
  const cy = height * center[1];
  return {
    cx,
    cy,
    rx: Math.max(cx, width - cx) * Math.SQRT2,
    ry: Math.max(cy, height - cy) * Math.SQRT2,
  };
}

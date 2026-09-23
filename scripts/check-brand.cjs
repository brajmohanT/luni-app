// Run with: node scripts/check-brand.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function readModule(relativePath, imports = {}) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, require: id => imports[id] });
  return exports;
}

const { linearGradientPoints, radialGradientEllipse } = readModule('src/design-system/components/brand-gradient-geometry.ts');
const { luniLogo } = readModule('src/design-system/assets/luni-logo.ts');
const colors = readModule('src/design-system/tokens/colors.ts');
const { brandGradients } = readModule('src/design-system/tokens/brand.ts', { './colors': colors });
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

// CSS 0deg points upward; 90deg points right. Rectangular containers must
// preserve direction and project their farthest corners to the endpoints.
for (const [width, height] of [[312, 190], [734, 520], [190, 312]]) {
  const up = linearGradientPoints(width, height, 0);
  near(up.y1, height); near(up.y2, 0);
  const right = linearGradientPoints(width, height, 90);
  near(right.x1, 0); near(right.x2, width);
  for (const gradient of Object.values(brandGradients)) {
    const points = linearGradientPoints(width, height, gradient.angle);
    near(points.x1 + points.x2, width);
    near(points.y1 + points.y2, height);
    near(Math.atan2(points.x2 - points.x1, -(points.y2 - points.y1)) * 180 / Math.PI, gradient.angle);
    for (const overlay of gradient.overlays) {
      const { cx, cy, rx, ry } = radialGradientEllipse(width, height, overlay.center);
      const farX = cx >= width / 2 ? 0 : width;
      const farY = cy >= height / 2 ? 0 : height;
      near(((farX - cx) / rx) ** 2 + ((farY - cy) / ry) ** 2, 1);
    }
  }
}

for (const file of ['system/design-system.html', 'prototypes/onboarding-screen.html']) {
  const html = fs.readFileSync(path.join(root, 'docs/design', file), 'utf8');
  const svg = html.match(/<svg[^>]*class="monogram"[\s\S]*?<\/svg>/)[0];
  assert.ok(svg.includes(`viewBox="${luniLogo.viewBox}"`));
  const approvedPaths = [...svg.matchAll(/<path d="([^"]+)"/g)].map(match => match[1]);
  assert.equal(JSON.stringify(luniLogo.paths), JSON.stringify(approvedPaths));
}
assert.equal(luniLogo.fill, '#FFFFFF');
assert.equal(brandGradients.identity.angle, 125);
assert.equal(brandGradients.welcome.angle, 130);
assert.equal(brandGradients.welcome.stops[1].color, '#0054FD');
console.log('Brand checks passed: CSS gradient geometry at three aspect ratios and exact supplied logo paths.');

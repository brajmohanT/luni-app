// Render the real controls through React Native Web without starting the app.
// Run: node scripts/check-controls.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const RN = require('react-native-web');
const root = path.resolve(__dirname, '..');
const cache = new Map();

function load(file) {
  const resolved = [file, `${file}.ts`, `${file}.tsx`, path.join(file, 'index.ts')]
    .find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!resolved) throw new Error(`Cannot resolve ${file}`);
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const mod = { exports: {} };
  cache.set(resolved, mod);
  const nativeRequire = Module.createRequire(resolved);
  const localRequire = id => id === 'react-native' ? RN
    : id.startsWith('.') ? load(path.resolve(path.dirname(resolved), id)) : nativeRequire(id);
  const { outputText } = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  new Function('require', 'module', 'exports', outputText)(localRequire, mod, mod.exports);
  return mod.exports;
}

const component = name => load(path.join(root, 'src/design-system/components', name));
const { Button } = component('button');
const { IconButton } = component('icon-button');
const { TextField } = component('text-field');
const { Switch } = component('switch');
const { SettingsRow } = component('settings-row');
const { ThemeProvider } = load(path.join(root, 'src/design-system/theme'));
const h = React.createElement;
const render = (mode, child) => renderToStaticMarkup(h(ThemeProvider, { initialPreference: mode }, child));
const icon = ({ color, size }) => h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8 },
  h('path', { d: 'M6 6l12 12M6 18L18 6', strokeLinecap: 'round' }));

for (const mode of ['light', 'dark']) {
  for (const value of [true, false]) {
    const toggle = render(mode, h(Switch, { value, onValueChange() {}, accessibilityLabel: 'Reminders', disabled: true }));
    assert.match(toggle, /role="switch"/);
    assert.ok(toggle.includes(`aria-checked="${value}"`));
    assert.match(toggle, /aria-disabled="true"/);
    assert.match(toggle, /aria-label="Reminders"/);
  }
  const toggleRow = render(mode, h(SettingsRow, { kind: 'toggle', label: 'Reminders', value: true, onValueChange() {} }));
  assert.equal((toggleRow.match(/role="switch"/g) || []).length, 1);
  assert.doesNotMatch(toggleRow, /role="button"/);
  const navigationRow = render(mode, h(SettingsRow, { kind: 'navigation', label: 'Appearance', value: 'System', onPress() {}, disabled: true }));
  assert.match(navigationRow, /role="button"/);
  assert.match(navigationRow, /aria-label="Appearance, System"/);
  assert.match(navigationRow, /aria-disabled="true"/);
  const infoRow = render(mode, h(SettingsRow, { kind: 'info', label: 'Version', value: 'Preview' }));
  assert.doesNotMatch(infoRow, /role="button"|role="switch"/);
  const loading = render(mode, h(Button, { loading: true, loadingLabel: 'Saving…' }, 'Save'));
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /aria-disabled="true"/);
  assert.match(loading, /aria-label="Saving…"/);
  const disabled = render(mode, h(Button, { disabled: true }, 'Continue'));
  assert.match(disabled, /aria-disabled="true"/);
  assert.match(render(mode, h(IconButton, { accessibilityLabel: 'Close', icon })), /aria-label="Close"/);
  const field = render(mode, h(TextField, { nativeID: 'email', label: 'Email', value: 'unfinished@', errorText: 'Enter a valid email.', helperText: 'Use your email address.' }));
  assert.match(field, /value="unfinished@"/);
  assert.match(field, /aria-invalid="true"/);
  assert.match(field, /aria-describedby="email-message"/);
  assert.match(field, /id="email-message"/);
  assert.match(field, /Enter a valid email\./);
  assert.doesNotMatch(field, /Use your email address\./);
  const locked = render(mode, h(TextField, { label: 'Name', value: 'Alex', disabled: true }));
  assert.match(locked, /readOnly=""/i);
  assert.match(locked, /aria-disabled="true"/);
}

function specimens(mode) {
  return render(mode, h(RN.View, { style: { backgroundColor: mode === 'dark' ? '#060709' : '#F9FBFD', padding: 24, gap: 20 } },
    h(RN.View, { style: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 } },
      h(Button, null, 'Continue'), h(Button, { variant: 'outlined' }, 'Cancel'),
      h(Button, { variant: 'destructive' }, 'Delete account'),
      h(IconButton, { accessibilityLabel: 'Close', icon })),
    h(Button, { loading: true, loadingLabel: 'Saving…' }, 'Save'),
    h(Button, { disabled: true }, 'Continue'),
    h(Button, { variant: 'outlined' }, 'A longer action label that can wrap when you increase text size'),
    h(TextField, { label: 'Preferred name', defaultValue: 'Alex', helperText: 'You can change this later.' }),
    h(TextField, { label: 'Email', defaultValue: 'unfinished@', errorText: 'Enter a valid email.' }),
    h(TextField, { label: 'Unavailable field', value: 'Preserved value', disabled: true }),
  ));
}
const previews = ['light', 'dark'].map(mode => `<section><h2>${mode}</h2>${specimens(mode)}</section>`).join('');
const sheet = RN.StyleSheet.getSheet();
fs.mkdirSync(path.join(root, '.expo'), { recursive: true });
fs.writeFileSync(path.join(root, '.expo/controls-preview.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Luni controls review</title><style>${sheet.textContent}</style><style>body{margin:24px;background:#dfe2e5;font-family:Arial,sans-serif}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,312px),1fr));gap:24px;max-width:1000px;margin:auto}h1,p{max-width:1000px;margin:16px auto}h2{font-size:16px;text-transform:capitalize}section{min-width:0}</style></head><body><h1>Luni controls</h1><p>Static rendering of the React Native components. Interaction checks require the running app.</p><main>${previews}</main></body></html>`);
console.log('Passed control semantics in light and dark mode. Preview: .expo/controls-preview.html');

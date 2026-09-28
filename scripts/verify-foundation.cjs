/* global __dirname */
// Run all local foundation checks and stop immediately if a command fails.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const projectRoot = path.resolve(__dirname, '..');
const checks = [
  ['Regression tests', ['--test', '--test-reporter=dot', 'scripts/check-api-client.cjs', 'scripts/check-query-hooks.cjs', 'scripts/check-chat-retry.cjs', 'scripts/check-chat-persistence.cjs', 'scripts/check-environment.cjs', 'scripts/check-onboarding-completion.cjs', 'scripts/check-onboarding-routing.cjs']],
  ['TypeScript', [require.resolve('typescript/bin/tsc'), '--noEmit']],
  ['ESLint', [path.join(path.dirname(require.resolve('eslint/package.json')), 'bin/eslint.js'), '.', '--max-warnings=0']],
  ['Brand assets', ['scripts/check-brand.cjs']],
  ['Shared controls', ['scripts/check-controls.cjs']],
];
for (const [label, args] of checks) {
  console.log(`Checking ${label}...`);
  const result = spawnSync(process.execPath, args, { cwd: projectRoot, stdio: 'inherit' });
  if (result.error) {
    console.error(`${label} could not start: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('Local foundation checks passed. Live API and native device checks are separate.');

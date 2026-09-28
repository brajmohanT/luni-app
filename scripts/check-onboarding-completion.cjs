/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../src/features/profile/onboarding-completion-controller.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleExports = {};
vm.runInNewContext(compiled, { exports: moduleExports }, { filename });
const { OnboardingCompletionController } = moduleExports;
const profile = (style, completed = false) => ({ conversationStyle: style, onboardingCompletedAt: completed ? '2026-09-28T12:00:00Z' : null });
const fail = async () => { throw new Error('Network error'); };

for (const style of ['warm_balanced', 'gentle_reassuring', 'playful_casual', 'direct_thoughtful']) {
  test(`${style}: save precedes bodyless completion and confirmed handoff`, async () => {
    const controller = new OnboardingCompletionController();
    const calls = [];
    await controller.submit(style, async input => {
      calls.push(['save', input.conversationStyle]);
      assert.equal(controller.getSnapshot().phase, 'saving');
      return profile(style);
    }, async (...args) => {
      assert.equal(args.length, 0);
      assert.equal(controller.getSnapshot().phase, 'completing');
      calls.push(['complete']);
      return profile(style, true);
    });
    assert.deepEqual(calls, [['save', style], ['complete']]);
    assert.equal(controller.getSnapshot().phase, 'complete');
  });
}

test('Skip overrides a selected style with the default', async () => {
  const controller = new OnboardingCompletionController();
  controller.select('playful_casual');
  await controller.submit('warm_balanced', async input => {
    assert.equal(input.conversationStyle, 'warm_balanced');
    return profile(input.conversationStyle);
  }, async () => profile('warm_balanced', true));
  assert.equal(controller.getSnapshot().style, 'warm_balanced');
});

test('failed save retains selection, blocks completion, and retries saving', async () => {
  const controller = new OnboardingCompletionController();
  let completions = 0;
  const complete = async () => { completions++; return profile('direct_thoughtful', true); };
  await controller.submit('direct_thoughtful', fail, complete);
  assert.equal(completions, 0);
  assert.equal(controller.getSnapshot().style, 'direct_thoughtful');
  assert.equal(controller.getSnapshot().phase, 'failed');
  await controller.submit('direct_thoughtful', async () => profile('direct_thoughtful'), complete);
  assert.equal(completions, 1);
  assert.equal(controller.getSnapshot().phase, 'complete');
});

test('completion failure retries completion without another save, including lost-response replay', async () => {
  const controller = new OnboardingCompletionController();
  let saves = 0;
  const save = async () => { saves++; return profile('gentle_reassuring'); };
  await controller.submit('gentle_reassuring', save, fail);
  assert.equal(controller.getSnapshot().phase, 'failed');
  await controller.submit('gentle_reassuring', save, async () => profile('gentle_reassuring', true));
  assert.equal(saves, 1);
  assert.equal(controller.getSnapshot().phase, 'complete');
});

test('same-tick repeated actions and selection changes cannot overlap either stage', async () => {
  const controller = new OnboardingCompletionController();
  let resolveSave;
  let resolveComplete;
  const pending = controller.submit('playful_casual', () => new Promise(resolve => { resolveSave = resolve; }),
    () => new Promise(resolve => { resolveComplete = resolve; }));
  await controller.submit('warm_balanced', assert.fail, assert.fail);
  controller.select('direct_thoughtful');
  assert.equal(controller.getSnapshot().style, 'playful_casual');
  resolveSave(profile('playful_casual'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(controller.getSnapshot().phase, 'completing');
  await controller.submit('warm_balanced', assert.fail, assert.fail);
  resolveComplete(profile('playful_casual', true));
  await pending;
  await controller.submit('warm_balanced', assert.fail, assert.fail);
});

test('editing after a completion failure requires saving the new choice', async () => {
  const controller = new OnboardingCompletionController();
  await controller.submit('playful_casual', async () => profile('playful_casual'), fail);
  controller.select('direct_thoughtful');
  let saves = 0;
  await controller.submit('direct_thoughtful', async () => { saves++; return profile('direct_thoughtful'); },
    async () => profile('direct_thoughtful', true));
  assert.equal(saves, 1);
});

test('an uncertain replacement save invalidates the earlier confirmed style', async () => {
  const controller = new OnboardingCompletionController();
  await controller.submit('playful_casual', async () => profile('playful_casual'), fail);
  await controller.submit('direct_thoughtful', fail, assert.fail);
  assert.equal(controller.getSnapshot().savedStyle, null);
  let saves = 0;
  await controller.submit('playful_casual', async () => { saves++; return profile('playful_casual'); },
    async () => profile('playful_casual', true));
  assert.equal(saves, 1);
});

test('unmount during saving prevents completion from starting', async () => {
  const controller = new OnboardingCompletionController();
  let resolveSave;
  const pending = controller.submit('warm_balanced', () => new Promise(resolve => { resolveSave = resolve; }), assert.fail);
  controller.cancel();
  resolveSave(profile('warm_balanced'));
  await pending;
  assert.equal(controller.getSnapshot().phase, 'idle');
});

test('unmount during completion prevents a stale handoff', async () => {
  const controller = new OnboardingCompletionController();
  let resolveComplete;
  const pending = controller.submit('warm_balanced', async () => profile('warm_balanced'),
    () => new Promise(resolve => { resolveComplete = resolve; }));
  await new Promise(resolve => setImmediate(resolve));
  controller.cancel();
  resolveComplete(profile('warm_balanced', true));
  await pending;
  assert.equal(controller.getSnapshot().phase, 'idle');
});

test('a response without completion confirmation cannot trigger handoff', async () => {
  const controller = new OnboardingCompletionController();
  await controller.submit('warm_balanced', async () => profile('warm_balanced'), async () => profile('warm_balanced'));
  assert.equal(controller.getSnapshot().phase, 'failed');
});

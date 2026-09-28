import type { ConversationStyle, Profile, UpdateProfileRequest } from '@/lib/api/types';

type Phase = 'idle' | 'saving' | 'completing' | 'failed' | 'complete';
type State = {
  phase: Phase;
  style: ConversationStyle | null;
  savedStyle: ConversationStyle | null;
  error: unknown;
};

// Retains the confirmed save across completion retries and blocks same-tick taps.
export class OnboardingCompletionController {
  private state: State = { phase: 'idle', style: null, savedStyle: null, error: null };
  private listeners = new Set<() => void>();
  private generation = 0;
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private publish(update: Partial<State>) {
    this.state = { ...this.state, ...update };
    this.listeners.forEach(listener => listener());
  }
  isBusy = () => ['saving', 'completing', 'complete'].includes(this.state.phase);
  select = (style: ConversationStyle) => {
    if (!this.isBusy()) this.publish({ style, phase: 'idle', error: null });
  };
  cancel = () => {
    this.generation++;
    this.publish({ phase: 'idle', error: null });
  };
  async submit(
    style: ConversationStyle,
    save: (request: UpdateProfileRequest) => Promise<Profile>,
    complete: () => Promise<Profile>,
  ) {
    if (this.isBusy()) return;
    const generation = this.generation;
    const needsSave = this.state.savedStyle !== style;
    this.publish({ style, error: null, savedStyle: needsSave ? null : this.state.savedStyle, phase: needsSave ? 'saving' : 'completing' });
    try {
      if (needsSave) {
        const profile = await save({ conversationStyle: style });
        if (generation !== this.generation) return;
        if (profile.conversationStyle !== style) throw new Error('Style save was not confirmed.');
        this.publish({ savedStyle: style, phase: 'completing' });
      }
      const profile = await complete();
      if (generation !== this.generation) return;
      if (!profile.onboardingCompletedAt) throw new Error('Onboarding completion was not confirmed.');
      this.publish({ phase: 'complete' });
    } catch (error) {
      if (generation === this.generation) this.publish({ phase: 'failed', error });
    }
  }
}

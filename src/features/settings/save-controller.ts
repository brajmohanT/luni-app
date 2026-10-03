// Blocks duplicate saves and prevents a completed request from navigating after unmount.
export class SettingsSaveController {
  private busy = false;
  private generation = 0;

  isBusy = () => this.busy;

  cancel = () => {
    this.generation++;
    this.busy = false;
  };

  async run(save: () => Promise<unknown>, onSuccess: () => void, onError?: (error: unknown) => void) {
    if (this.busy) return;
    this.busy = true;
    const generation = this.generation;
    try {
      await save();
      if (generation === this.generation) onSuccess();
    } catch (error) {
      if (generation === this.generation) onError?.(error);
      // Mutation state or onError owns the failure; callers need no second catch.
    } finally {
      if (generation === this.generation) this.busy = false;
    }
  }
}

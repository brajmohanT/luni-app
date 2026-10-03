// Bound the caller's wait even if the underlying operation ignores cancellation.
// Keep multi-step flows outside this callback so timeout stops subsequent steps.
export async function withRequestTimeout<T>(
  request: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Request timed out. Please try again.'));
          controller.abort();
        }, 20_000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

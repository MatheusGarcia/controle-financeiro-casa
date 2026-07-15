const slowOperationThresholdMs = 750;

export async function observe<T>(operation: string, work: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();

  try {
    return await work();
  } catch (error) {
    console.error(JSON.stringify({ event: "operation_failed", operation, durationMs: Math.round(performance.now() - startedAt) }));
    throw error;
  } finally {
    const durationMs = Math.round(performance.now() - startedAt);
    if (durationMs >= slowOperationThresholdMs) {
      console.warn(JSON.stringify({ event: "slow_operation", operation, durationMs }));
    }
  }
}

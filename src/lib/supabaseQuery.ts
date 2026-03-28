/**
 * Wraps a Supabase query promise with a timeout.
 * If the query takes longer than `ms` milliseconds, it resolves with empty data
 * instead of hanging indefinitely (which happens during Supabase auth lock contention).
 */
export async function withTimeout<T>(
  queryPromise: PromiseLike<{ data: T | null; error: any }>,
  ms: number = 8000
): Promise<{ data: T | null; error: any }> {
  const timeout = new Promise<{ data: T | null; error: any }>((resolve) => {
    setTimeout(() => {
      console.warn(`[supabaseQuery] Query timed out after ${ms}ms — returning empty.`);
      resolve({ data: null, error: { message: 'Query timed out', code: 'TIMEOUT' } });
    }, ms);
  });

  return Promise.race([queryPromise, timeout]);
}

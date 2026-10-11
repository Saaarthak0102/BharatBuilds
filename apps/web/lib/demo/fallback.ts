import { isDemoMode } from './demoSession';
import { demoStatusTracker, FeatureSource } from './statusTracker';

/**
 * Timeout wrapper for a Promise.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage = 'Request timed out'): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(errorMessage);
      (err as any).name = 'TimeoutError';
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

export interface DemoFallbackOptions<T> {
  featureKey: string;
  realCall: () => Promise<T>;
  demoCall: () => Promise<T> | T;
  validator?: (data: T) => boolean;
  timeoutMs?: number;
  details?: {
    live?: string;
    demo?: string;
  };
}

/**
 * Executes a call following the Real-First, Demo-Fallback rule:
 * - If demo mode is OFF: runs realCall directly (never hides errors).
 * - If demo mode is ON: tries realCall with timeout. If successful and passes validator,
 *   tags source as "live" and returns real data. Otherwise falls back to demoCall,
 *   tags source as "demo", tags data with is_sample = true.
 */
export async function withDemoFallback<T>(options: DemoFallbackOptions<T>): Promise<T> {
  const { featureKey, realCall, demoCall, validator, timeoutMs = 6000, details } = options;

  // 1. Without demo mode, execute real call directly
  if (!isDemoMode()) {
    return realCall();
  }

  // 2. In demo mode: Real First
  try {
    const realResult = await withTimeout(realCall(), timeoutMs, `Real ${featureKey} call timed out after ${timeoutMs}ms`);

    // Extract payload from ApiResponse envelope if present
    const payload = (realResult && typeof realResult === 'object' && 'data' in (realResult as any))
      ? (realResult as any).data
      : realResult;

    // Run validator check if provided
    const isValid = validator ? validator(payload) : Boolean(payload);

    if (isValid) {
      demoStatusTracker.setSource(featureKey, 'live', details?.live);
      // Tag envelope / data with source
      if (realResult && typeof realResult === 'object') {
        (realResult as any)._source = 'live';
        if (payload && typeof payload === 'object') {
          payload._source = 'live';
          if (Array.isArray(payload.tool_trace)) {
            payload.tool_trace = payload.tool_trace.map((t: any) => ({
              ...t,
              source: t.source || 'live',
            }));
          }
        }
      }
      return realResult;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[DemoFallback] ${featureKey} real response failed validation; falling back to demo.`);
    }
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[DemoFallback] ${featureKey} real call failed (${err?.message || err}); using demo fallback.`);
    }
  }

  // 3. Fallback to Demo
  demoStatusTracker.setSource(featureKey, 'demo', details?.demo);
  const demoResult = await demoCall();

  if (demoResult && typeof demoResult === 'object') {
    (demoResult as any)._source = 'demo';
    const payload = ('data' in (demoResult as any)) ? (demoResult as any).data : demoResult;
    if (payload && typeof payload === 'object') {
      payload._source = 'demo';
      if (payload.is_sample === undefined) {
        payload.is_sample = true;
      }
    }
  }

  return demoResult;
}

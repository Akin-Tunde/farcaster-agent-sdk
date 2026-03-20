import type { ApiAction, ActionParams, ExecutionContext, ExecutionResult } from '../types';

export class ApiExecutor {
  async execute<T = unknown>(
    action: ApiAction,
    params: ActionParams,
    ctx: ExecutionContext = {}
  ): Promise<ExecutionResult<T>> {
    const start = Date.now();

    try {
      const url = this.resolveUrl(action.location, ctx.baseUrl);
      const method = (action.method ?? 'POST').toUpperCase();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...ctx.headers,
      };

      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        ctx.timeoutMs ?? 30_000
      );

      let response: Response;
      try {
   // After
const hasBody = method !== 'GET' && method !== 'HEAD';
const fetchInit: RequestInit = hasBody
  ? { method, headers, signal: controller.signal, body: JSON.stringify(params) }
  : { method, headers, signal: controller.signal };
response = await fetch(url, fetchInit);
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${body || response.statusText}`);
      }

      const contentType = response.headers.get('content-type') ?? '';
      const data = contentType.includes('application/json')
        ? (await response.json()) as T
        : (await response.text()) as unknown as T;

      return {
        success: true,
        data,
        action: action.name,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
        action: action.name,
        durationMs: Date.now() - start,
      };
    }
  }

  private resolveUrl(location: string, baseUrl?: string): string {
    // Absolute URL — use as-is
    if (location.startsWith('http://') || location.startsWith('https://')) {
      return location;
    }
    // Relative path — needs baseUrl
    if (!baseUrl) {
      throw new Error(
        `Action location "${location}" is relative but no baseUrl was provided in ExecutionContext`
      );
    }
    return new URL(location, baseUrl).toString();
  }
}

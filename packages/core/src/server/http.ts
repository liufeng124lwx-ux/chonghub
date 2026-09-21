import { isAppError } from './errors';

export function jsonData<T>(data: T, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  return Response.json({ data }, { ...init, headers });
}

export function jsonError(error: unknown, requestId = crypto.randomUUID()) {
  const known = isAppError(error) ? error : undefined;
  return Response.json({
    error: { code: known?.code ?? 'INTERNAL_ERROR', message: known?.message ?? '服务暂不可用，请稍后再试。', requestId },
  }, { status: known?.status ?? 500, headers: { 'Cache-Control': 'no-store' } });
}

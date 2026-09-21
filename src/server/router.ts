import { jsonError } from './http';

export async function routeSafely<T>(handler: () => Promise<T>) {
  try {
    return await handler();
  } catch (error) {
    return jsonError(error);
  }
}

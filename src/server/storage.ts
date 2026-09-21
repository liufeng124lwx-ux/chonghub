import 'server-only';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const root = resolve(process.env.PRIVATE_STORAGE_DIR || './var/private');

function safePath(key: string): string {
  if (!/^[a-f0-9-]{36}\.(?:jpg|jpeg|png|webp)$/i.test(key)) throw new Error('invalid storage key');
  const path = resolve(join(root, key));
  if (!path.startsWith(`${root}/`)) throw new Error('invalid storage path');
  return path;
}

export async function putPrivateFile(bytes: Buffer, extension: 'jpg' | 'jpeg' | 'png' | 'webp'): Promise<string> {
  const key = `${randomUUID()}.${extension}`;
  const path = safePath(key);
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${randomUUID()}`;
  try { await writeFile(temporary, bytes, { flag: 'wx' }); await rename(temporary, path); return key; }
  catch (error) { await rm(temporary, { force: true }); throw error; }
}

export async function readPrivateFile(key: string): Promise<Buffer> { return readFile(safePath(key)); }

/** Remove an attachment after its database insert failed. */
export async function removePrivateFile(key: string): Promise<void> {
  await rm(safePath(key), { force: true });
}

import 'server-only';

import sharp from 'sharp';
import { withTransaction, query } from '@chonghub/core/server/db';
import { AppError } from '@chonghub/core/server/errors';
import type { Actor } from '@chonghub/core/modules/orders/contracts';
import { readPrivateFile, putPrivateFile, removePrivateFile } from '@chonghub/core/server/storage';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PIXELS = 20_000_000;
const MAX_ATTACHMENTS = 3;

const formats = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

type AcceptedMime = keyof typeof formats;

interface AttachmentAccessRow {
  order_id: string;
  owner_user_id: string | null;
  attachment_count: string;
}

function isAcceptedMime(mime: string): mime is AcceptedMime {
  return Object.prototype.hasOwnProperty.call(formats, mime);
}

function canAccess(actor: Actor, orderId: string, ownerUserId: string | null): boolean {
  if (actor.kind === 'admin') return true;
  if (actor.kind === 'user') return actor.userId === ownerUserId;
  return actor.orderId === orderId;
}

/**
 * Decode and re-encode the image before it reaches private storage. Sharp
 * verifies the real format, limits decompression work, and omits metadata
 * because no `withMetadata()` call is made.
 */
async function normalizeImage(bytes: Buffer, mime: string): Promise<Buffer> {
  if (bytes.length === 0 || bytes.length > MAX_BYTES || !isAcceptedMime(mime)) {
    throw new AppError('INVALID_REQUEST', '附件格式或大小不符合要求。');
  }

  try {
    const image = sharp(bytes, { failOn: 'error', limitInputPixels: MAX_PIXELS });
    const metadata = await image.metadata();
    if (metadata.format !== formats[mime] || !metadata.width || !metadata.height || metadata.width * metadata.height > MAX_PIXELS) {
      throw new AppError('INVALID_REQUEST', '附件内容与声明格式不一致，或图片尺寸过大。');
    }

    const normalized = await image.toFormat(formats[mime]).toBuffer();
    if (normalized.length === 0 || normalized.length > MAX_BYTES) {
      throw new AppError('INVALID_REQUEST', '附件格式或大小不符合要求。');
    }
    return normalized;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('INVALID_REQUEST', '附件不是可识别的图片。');
  }
}

export async function saveAttachment(caseId: string, actor: Actor, bytes: Buffer, mime: string): Promise<string> {
  const normalized = await normalizeImage(bytes, mime);
  const extension = formats[mime as AcceptedMime] === 'jpeg' ? 'jpg' : formats[mime as AcceptedMime];
  const storageKey = await putPrivateFile(normalized, extension);

  try {
    await withTransaction(async (client) => {
      const access = await client.query<AttachmentAccessRow>(
        `SELECT a.order_id, o.owner_user_id,
                (SELECT count(*)::text FROM attachments x WHERE x.after_sale_id = a.id) AS attachment_count
           FROM after_sales a
           JOIN orders o ON o.id = a.order_id
          WHERE a.id = $1
          FOR UPDATE`,
        [caseId],
      );
      const row = access.rows[0];
      if (!row || !canAccess(actor, row.order_id, row.owner_user_id)) {
        throw new AppError('NOT_FOUND', '售后不存在。', 404);
      }
      if (Number(row.attachment_count) >= MAX_ATTACHMENTS) {
        throw new AppError('INVALID_REQUEST', '每个售后最多上传 3 个附件。');
      }

      await client.query(
        `INSERT INTO attachments (after_sale_id, storage_key, mime, bytes, uploaded_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [caseId, storageKey, mime, normalized.length, actor.kind],
      );
    });
  } catch (error) {
    // The database transaction is authoritative. Do not leave an orphaned
    // private file when authorization, the count limit, or the insert fails.
    await removePrivateFile(storageKey).catch(() => undefined);
    throw error;
  }

  return storageKey;
}

export async function readAttachment(id: string, actor: Actor): Promise<{ bytes: Buffer; mime: AcceptedMime }> {
  const result = await query<{
    storage_key: string;
    mime: string;
    order_id: string;
    owner_user_id: string | null;
  }>(
    `SELECT x.storage_key, x.mime, a.order_id, o.owner_user_id
       FROM attachments x
       JOIN after_sales a ON a.id = x.after_sale_id
       JOIN orders o ON o.id = a.order_id
      WHERE x.id = $1`,
    [id],
  );
  const row = result.rows[0];
  if (!row || !isAcceptedMime(row.mime) || !canAccess(actor, row.order_id, row.owner_user_id)) {
    throw new AppError('NOT_FOUND', '附件不存在。', 404);
  }
  return { bytes: await readPrivateFile(row.storage_key), mime: row.mime };
}

export async function listAttachments(caseId: string, actor: Actor): Promise<Array<{ id: string; mime: AcceptedMime; bytes: number; createdAt: string }>> {
  const access = await query<{ order_id: string; owner_user_id: string | null }>(
    `SELECT a.order_id, o.owner_user_id
       FROM after_sales a
       JOIN orders o ON o.id = a.order_id
      WHERE a.id = $1`,
    [caseId],
  );
  const row = access.rows[0];
  if (!row || !canAccess(actor, row.order_id, row.owner_user_id)) throw new AppError('NOT_FOUND', '售后不存在。', 404);
  const result = await query<{ id: string; mime: string; bytes: number; created_at: Date | string }>(
    `SELECT id, mime, bytes, created_at FROM attachments WHERE after_sale_id = $1 ORDER BY created_at ASC`,
    [caseId],
  );
  return result.rows.filter((item): item is typeof item & { mime: AcceptedMime } => isAcceptedMime(item.mime)).map((item) => ({
    id: item.id,
    mime: item.mime,
    bytes: item.bytes,
    createdAt: new Date(item.created_at).toISOString(),
  }));
}

export { MAX_ATTACHMENTS, MAX_BYTES, MAX_PIXELS };

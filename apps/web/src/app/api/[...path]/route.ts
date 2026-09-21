/* eslint-disable @typescript-eslint/no-explicit-any */
import { jsonData } from '@chonghub/core/server/http';
import { routeSafely } from '@chonghub/core/server/router';
import { AppError } from '@chonghub/core/server/errors';
import { listPublishedProducts, getPublishedProduct } from '@chonghub/core/modules/catalog/service';
import { getPublicSettings } from '@chonghub/core/modules/settings/service';
import { sendOtp, verifyGuestAccess, verifyGuestReset, verifyLogin } from '@chonghub/core/modules/auth/otp';
import { clearSessionCookie, revokeSession, sessionCookie, sessionTokenFromRequest } from '@chonghub/core/modules/auth/session';
import { readActor, GUEST_COOKIE } from '@chonghub/core/modules/auth/access';
import { createGuestGrant } from '@chonghub/core/modules/auth/guest-grant';
import { query } from '@chonghub/core/server/db';
import { normalizeEmail } from '@chonghub/core/modules/auth/contracts';
import { createRequest } from '@chonghub/core/modules/orders/create';
import { getPublicOrder, listMyOrders } from '@chonghub/core/modules/orders/query';
import { addCustomerMessage, recordScreening } from '@chonghub/core/modules/orders/commands';
import { getRefundSuggestion, listAfterSales, openAfterSale } from '@chonghub/core/modules/after-sales/service';
import { readAttachment, saveAttachment } from '@chonghub/core/modules/after-sales/attachments';

type Ctx = { params: Promise<{ path?: string[] }> };
async function body(request: Request, maxBytes = 64 * 1024): Promise<Record<string, unknown>> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new AppError('REQUEST_TOO_LARGE', '请求内容过大。', 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) throw new AppError('REQUEST_TOO_LARGE', '请求内容过大。', 413);
  let value: unknown;
  try { value = JSON.parse(raw) as unknown; } catch { throw new AppError('INVALID_REQUEST', '请求格式无效。'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AppError('INVALID_REQUEST', '请求格式无效。');
  return value as Record<string, unknown>;
}
function text(value: unknown, name: string): string { if (typeof value !== 'string' || value.length === 0) throw new AppError('INVALID_REQUEST', `${name} 无效。`); return value; }
function email(value: unknown): string { try { return normalizeEmail(text(value, '邮箱')); } catch { throw new AppError('INVALID_REQUEST', '邮箱格式无效。'); } }
function declaredSubscription(value: unknown): 'free' | 'subscribed' | 'unknown' {
  if (value === 'free' || value === 'subscribed' || value === 'unknown') return value;
  throw new AppError('INVALID_REQUEST', '订阅状态无效。');
}
function draftScope(request: Request): string { const cookie = request.headers.get('cookie')?.match(/chonghub_draft=([^;]+)/)?.[1]; return cookie ? decodeURIComponent(cookie) : crypto.randomUUID(); }

async function handler(request: Request, { params }: Ctx) {
  const segments = (await params).path ?? [];
  const path = `/${segments.join('/')}`;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('origin');
    const allowedOrigin = process.env.APP_ORIGIN || new URL(request.url).origin;
    if (!origin || origin !== allowedOrigin) throw new AppError('CSRF_REJECTED', '请求来源不受信任。', 403);
  }
  const actor = await readActor(request);
  if (request.method === 'GET' && path === '/products') return jsonData(await listPublishedProducts());
  if (request.method === 'GET' && path.startsWith('/products/')) { const product = await getPublishedProduct(path.slice('/products/'.length)); if (!product) throw new AppError('NOT_FOUND', '商品不存在。', 404); return jsonData(product); }
  if (request.method === 'GET' && path === '/settings/public') return jsonData(await getPublicSettings());
  if (request.method === 'POST' && path === '/auth/otp') {
    const data = await body(request);
    if (data.purpose !== 'login' && data.purpose !== 'guest_reset') throw new AppError('INVALID_REQUEST', '验证码用途无效。');
    await sendOtp(email(data.email), data.purpose, typeof data.orderNumber === 'string' ? data.orderNumber : undefined, request.headers.get('x-forwarded-for') ?? 'unknown');
    return jsonData({ accepted: true });
  }
  if (request.method === 'POST' && path === '/auth/verify') { const data = await body(request); const result = await verifyLogin(email(data.email), text(data.code, '验证码')); const response = jsonData({ userId: result.userId }); response.headers.append('Set-Cookie', sessionCookie(result.sessionToken, new Date(result.expiresAt))); return response; }
  if (request.method === 'POST' && path === '/auth/logout') {
    const token = sessionTokenFromRequest(request);
    if (token) await revokeSession(token);
    const response = jsonData({ loggedOut: true });
    response.headers.append('Set-Cookie', clearSessionCookie());
    return response;
  }
  if (request.method === 'POST' && path === '/guest/access') { const data = await body(request); const number = text(data.number, '单号'); const canonicalEmail = email(data.email); const result = await verifyGuestAccess(canonicalEmail, number, text(data.code, '验证码')); const grant=await createGuestGrant(result.orderId); const response=jsonData({ orderNumber:number }); response.headers.append('Set-Cookie', `${GUEST_COOKIE}=${encodeURIComponent(grant.token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${24*60*60}${process.env.NODE_ENV==='production'?'; Secure':''}`); return response; }
  if (request.method === 'POST' && path === '/guest/reset/request') { const data=await body(request); const number=text(data.number,'单号'); const canonicalEmail=email(data.email); const owned=await query<{id:string}>('SELECT id FROM orders WHERE number=$1 AND contact_email=$2 AND owner_user_id IS NULL',[number,canonicalEmail]); if(owned.rows[0]) await sendOtp(canonicalEmail,'guest_reset',number,request.headers.get('x-forwarded-for')??'unknown'); return jsonData({ accepted:true }); }
  if (request.method === 'POST' && path === '/guest/reset/confirm') { const data=await body(request); const number=text(data.number,'单号'); const canonicalEmail=email(data.email); const newPassword=text(data.newPassword,'新密码'); const result=await verifyGuestReset(canonicalEmail,number,text(data.code,'验证码'),newPassword); const grant=await createGuestGrant(result.orderId); const response=jsonData({ orderNumber:number }); response.headers.append('Set-Cookie', `${GUEST_COOKIE}=${encodeURIComponent(grant.token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${24*60*60}${process.env.NODE_ENV==='production'?'; Secure':''}`); return response; }
  if (request.method === 'POST' && path === '/orders') {
    const data = await body(request);
    const input = {
      skuId: text(data.skuId, '套餐'),
      contactEmail: email(data.contactEmail),
      declaredSubscription: declaredSubscription(data.declaredSubscription),
      note: typeof data.note === 'string' ? data.note : '',
    };
    const result = await createRequest(input, actor, text(data.idempotencyKey, '提交标识'), draftScope(request));
    const response = jsonData(result.order, { status: 201 });
    if (result.guestToken) response.headers.append('Set-Cookie', `${GUEST_COOKIE}=${encodeURIComponent(result.guestToken)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${24*60*60}${process.env.NODE_ENV==='production'?'; Secure':''}`);
    return response;
  }
  if (request.method === 'GET' && path === '/me/orders') { if (!actor || actor.kind === 'guest') throw new AppError('AUTH_REQUIRED','请先登录。',401); return jsonData(await listMyOrders(actor)); }
  const screeningMatch = path.match(/^\/orders\/([^/]+)\/screening$/); if (request.method === 'POST' && screeningMatch) { const data=await body(request, 4 * 1024); if(!actor) throw new AppError('AUTH_REQUIRED','请先登录或使用访客凭据。',401); await recordScreeningByNumber(screeningMatch[1], actor, data.report, text(data.idempotencyKey,'操作标识')); return jsonData({ accepted:true }); }
  const messageMatch = path.match(/^\/orders\/([^/]+)\/messages$/); if (request.method === 'POST' && messageMatch) { if(!actor) throw new AppError('AUTH_REQUIRED','请先登录或使用访客凭据。',401); const data=await body(request); const order=await findOrderId(messageMatch[1]); await addCustomerMessage(order.id,actor,text(data.message,'补充内容'),text(data.idempotencyKey,'操作标识')); return jsonData({ accepted:true }); }
  const afterSaleMatch = path.match(/^\/orders\/([^/]+)\/after-sales$/); if (request.method === 'POST' && afterSaleMatch) { if(!actor) throw new AppError('AUTH_REQUIRED','请先登录或使用访客凭据。',401); const data=await body(request); return jsonData(await openAfterSale(afterSaleMatch[1],actor,{type:data.type as any,description:text(data.description,'说明')},text(data.idempotencyKey,'操作标识')),{status:201}); }
  if (request.method === 'GET' && afterSaleMatch) { if(!actor) throw new AppError('AUTH_REQUIRED','请先登录或使用访客凭据。',401); const order=await getPublicOrder(afterSaleMatch[1],actor); return jsonData({ orderNumber:order.number, cases:await listAfterSales(afterSaleMatch[1],actor) }); }
  const afterSaleSuggestionMatch = path.match(/^\/orders\/([^/]+)\/after-sales\/suggestion$/); if (request.method === 'GET' && afterSaleSuggestionMatch) { if(!actor) throw new AppError('AUTH_REQUIRED','请先登录或使用访客凭据。',401); return jsonData({ refundCents: await getRefundSuggestion(afterSaleSuggestionMatch[1], actor) }); }
  if (request.method === 'GET' && path.startsWith('/orders/')) { const rest=path.slice('/orders/'.length); if (rest.endsWith('/')) throw new AppError('NOT_FOUND','订单不存在。',404); return jsonData(await getPublicOrder(rest, actor)); }
  const attachmentUploadMatch = path.match(/^\/after-sales\/([^/]+)\/attachments$/); if (request.method === 'POST' && attachmentUploadMatch) { if(!actor) throw new AppError('AUTH_REQUIRED','请先登录或使用访客凭据。',401); const contentLength=Number(request.headers.get('content-length') ?? 0); if(Number.isFinite(contentLength) && contentLength > 5 * 1024 * 1024 + 256 * 1024) throw new AppError('PAYLOAD_TOO_LARGE','附件过大。',413); const form=await request.formData(); const file=form.get('file'); if(!(file instanceof File)) throw new AppError('INVALID_REQUEST','请选择图片附件。'); const bytes=Buffer.from(await file.arrayBuffer()); await saveAttachment(attachmentUploadMatch[1],actor,bytes,file.type); return jsonData({ uploaded:true },{status:201}); }
  const attachmentMatch = path.match(/^\/attachments\/([^/]+)$/); if (request.method === 'GET' && attachmentMatch) { if(!actor) throw new AppError('AUTH_REQUIRED','请先登录或使用访客凭据。',401); const file=await readAttachment(attachmentMatch[1],actor); return new Response(file.bytes as unknown as BodyInit,{headers:{'content-type':file.mime,'cache-control':'no-store','x-content-type-options':'nosniff'}}); }
  throw new AppError('NOT_FOUND','接口不存在。',404);
}

async function findOrderId(number: string) { const result=await query<{id:string}>('SELECT id FROM orders WHERE number=$1',[number]); if(!result.rows[0]) throw new AppError('NOT_FOUND','订单不存在。',404); return result.rows[0]; }
async function recordScreeningByNumber(number:string, actor: any, report: unknown, key:string) { const order=await findOrderId(number); await recordScreening(order.id,actor,report as any,key); }

export async function GET(request: Request, context: Ctx) { return routeSafely(() => handler(request, context)); }
export async function POST(request: Request, context: Ctx) { return routeSafely(() => handler(request, context)); }
export async function PATCH(request: Request, context: Ctx) { return routeSafely(() => handler(request, context)); }
export async function DELETE(request: Request, context: Ctx) { return routeSafely(() => handler(request, context)); }

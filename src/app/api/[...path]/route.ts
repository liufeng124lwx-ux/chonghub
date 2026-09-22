/* eslint-disable @typescript-eslint/no-explicit-any */
import { jsonData } from '@/server/http';
import { routeSafely } from '@/server/router';
import { AppError } from '@/server/errors';
import { listPublishedProducts, getPublishedProduct } from '@/modules/catalog/service';
import { getPublicSettings, updatePublicSettings } from '@/modules/settings/service';
import { sendOtp, verifyGuestAccess, verifyGuestReset, verifyLogin } from '@/modules/auth/otp';
import { clearSessionCookie, revokeSession, sessionCookie, sessionTokenFromRequest } from '@/modules/auth/session';
import { readActor, GUEST_COOKIE } from '@/modules/auth/access';
import { createGuestGrant } from '@/modules/auth/guest-grant';
import { query } from '@/server/db';
import { normalizeEmail } from '@/modules/auth/contracts';
import { createRequest } from '@/modules/orders/create';
import { getPublicOrder, listMyOrders } from '@/modules/orders/query';
import { addCustomerMessage, executeAdminCommand, parseAdminCommand, recordScreening } from '@/modules/orders/commands';
import { getRefundSuggestion, listAfterSales, openAfterSale, recordRefund } from '@/modules/after-sales/service';
import { readAttachment, saveAttachment } from '@/modules/after-sales/attachments';
import { updateCatalogEntry, publishProduct } from '@/modules/catalog/admin';
import { getNotificationSummary, retryNotification } from '@/modules/notifications/admin';

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
  const adminCommandMatch = path.match(/^\/admin\/orders\/([^/]+)\/commands$/); if (request.method === 'POST' && adminCommandMatch) { if(!actor) throw new AppError('AUTH_REQUIRED','请先登录。',401); const data=await body(request); return jsonData(await executeAdminCommand(adminCommandMatch[1],actor,parseAdminCommand(data.command),text(data.idempotencyKey,'操作标识'),Number(data.expectedVersion))); }
  if (request.method === 'GET' && path === '/admin/dashboard') { if(!actor || actor.kind!=='admin') throw new AppError('FORBIDDEN','无权访问后台。',403); const [counts, afterSales, overdue, notifications] = await Promise.all([query<{ delivery_status:string; count:string }>('SELECT delivery_status,count(*)::text count FROM orders GROUP BY delivery_status'), query<{ count:string }>(`SELECT count(*)::text AS count FROM after_sales WHERE status IN ('open','reviewing')`), query<{ count:string }>(`SELECT count(*)::text AS count FROM orders WHERE due_at IS NOT NULL AND due_at < now() AND delivery_status NOT IN ('completed','cancelled')`), getNotificationSummary()]); return jsonData({ counts:Object.fromEntries(counts.rows.map((row)=>[row.delivery_status,Number(row.count)])), afterSalesPending:Number(afterSales.rows[0]?.count ?? 0), overdueOrders:Number(overdue.rows[0]?.count ?? 0), notifications }); }
  if (request.method === 'GET' && path === '/admin/notifications') { if(!actor || actor.kind!=='admin') throw new AppError('FORBIDDEN','无权访问后台。',403); return jsonData(await getNotificationSummary()); }
  const notificationRetryMatch = path.match(/^\/admin\/notifications\/([^/]+)\/retry$/); if (request.method === 'POST' && notificationRetryMatch) { if(!actor || actor.kind!=='admin') throw new AppError('FORBIDDEN','无权访问后台。',403); const retried=await retryNotification(notificationRetryMatch[1],actor.userId); return jsonData({ retried }); }
  if (request.method === 'GET' && path === '/admin/orders') { if(!actor || actor.kind!=='admin') throw new AppError('FORBIDDEN','无权访问后台。',403); const url=new URL(request.url); const q=url.searchParams.get('q')?.trim() ?? ''; const status=url.searchParams.get('status')?.trim() ?? ''; const validStatuses=['pending_confirmation','pending','needs_info','processing','completed','cancelled']; if(status && !validStatuses.includes(status)) throw new AppError('INVALID_REQUEST','交付状态无效。'); const values: unknown[]=[]; const filters:string[]=[]; if(q){values.push(`%${q}%`);filters.push(`(number ILIKE $${values.length} OR contact_email ILIKE $${values.length})`);} if(status){values.push(status);filters.push(`delivery_status=$${values.length}`);} const requestedLimit=Number(url.searchParams.get('limit') ?? 100); const limit=Number.isSafeInteger(requestedLimit)?Math.min(100,Math.max(1,requestedLimit)):100; values.push(limit); const where=filters.length?`WHERE ${filters.join(' AND ')}`:''; const orders=await query<{ number:string; contact_email:string; delivery_status:string; payment_status:string; screening_status:string; quoted_price_cents:number|null; due_at:Date|null; created_at:Date }>(`SELECT number,contact_email,delivery_status,payment_status,screening_status,quoted_price_cents,due_at,created_at FROM orders ${where} ORDER BY created_at DESC LIMIT $${values.length}`, values); return jsonData(orders.rows.map((row)=>({ number:row.number, email:row.contact_email, deliveryStatus:row.delivery_status, paymentStatus:row.payment_status, screeningStatus:row.screening_status, quotedPriceCents:row.quoted_price_cents, dueAt:row.due_at?new Date(row.due_at).toISOString():null, createdAt:new Date(row.created_at).toISOString() }))); }
  if (request.method === 'PATCH' && path === '/admin/settings') { if(!actor || actor.kind!=='admin') throw new AppError('FORBIDDEN','无权访问后台。',403); const data=await body(request); await updatePublicSettings({ opensAt:typeof data.opensAt==='string'?data.opensAt:undefined, closesAt:typeof data.closesAt==='string'?data.closesAt:undefined, deliveryMinutes:typeof data.deliveryMinutes==='number'?data.deliveryMinutes:undefined, warrantyDays:typeof data.warrantyDays==='number'?data.warrantyDays:undefined, termsVersion:typeof data.termsVersion==='string'?data.termsVersion:undefined, nickname:typeof data.nickname==='string'?data.nickname:undefined, wechatId:typeof data.wechatId==='string'?data.wechatId:undefined, qrPath:typeof data.qrPath==='string'?data.qrPath:undefined }); return jsonData({ updated:true }); }
  const productAdminMatch = path.match(/^\/admin\/products\/([^/]+)$/);
  if (request.method === 'PATCH' && productAdminMatch) { if (!actor || actor.kind !== 'admin') throw new AppError('FORBIDDEN', '无权访问后台。', 403); const data=await body(request); await updateCatalogEntry(productAdminMatch[1], { name: typeof data.name==='string'?data.name:undefined, description: typeof data.description==='string'?data.description:undefined, priceCents: typeof data.priceCents==='number'?data.priceCents:undefined, skuId: typeof data.skuId==='string'?data.skuId:undefined }, actor, text(data.idempotencyKey, '操作标识')); return jsonData({ updated:true }); }
  const publishMatch = path.match(/^\/admin\/products\/([^/]+)\/publish$/);
  if (request.method === 'POST' && publishMatch) { if (!actor || actor.kind !== 'admin') throw new AppError('FORBIDDEN', '无权访问后台。', 403); await publishProduct(publishMatch[1]); return jsonData({ published:true }); }
  const refundMatch = path.match(/^\/admin\/after-sales\/([^/]+)\/refunds$/); if (request.method === 'POST' && refundMatch) { if(!actor || actor.kind!=='admin') throw new AppError('FORBIDDEN','无权访问后台。',403); const data=await body(request); await recordRefund(refundMatch[1],actor,{amountCents:Number(data.amountCents),refundedAt:text(data.refundedAt,'退款时间'),reference:text(data.reference,'退款参考号'),verifiedLossAt:typeof data.verifiedLossAt==='string'?data.verifiedLossAt:undefined},text(data.idempotencyKey,'操作标识'),Number(data.version)); return jsonData({ recorded:true }); }
  throw new AppError('NOT_FOUND','接口不存在。',404);
}

async function findOrderId(number: string) { const result=await query<{id:string}>('SELECT id FROM orders WHERE number=$1',[number]); if(!result.rows[0]) throw new AppError('NOT_FOUND','订单不存在。',404); return result.rows[0]; }
async function recordScreeningByNumber(number:string, actor: any, report: unknown, key:string) { const order=await findOrderId(number); await recordScreening(order.id,actor,report as any,key); }

export async function GET(request: Request, context: Ctx) { return routeSafely(() => handler(request, context)); }
export async function POST(request: Request, context: Ctx) { return routeSafely(() => handler(request, context)); }
export async function PATCH(request: Request, context: Ctx) { return routeSafely(() => handler(request, context)); }
export async function DELETE(request: Request, context: Ctx) { return routeSafely(() => handler(request, context)); }

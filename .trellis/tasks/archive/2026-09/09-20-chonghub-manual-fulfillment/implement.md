# ChongHub 人工充值服务站 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> 本轮仅编写实现计划。未创建 Trellis 任务、未开始业务实现、未授权提交或部署。上述执行技能在用户确认执行方式后使用，不因此自动启动子代理。

**Goal:** 实现三个 GPT 月卡商品、邮箱登录与游客需求单、浏览器初筛、微信人工履约、移动管理后台和售后通知的完整首版。

**Architecture:** 单个 Next.js 应用提供用户网站、管理后台及 HTTP 接口；业务逻辑按领域模块组织，通过 PostgreSQL 事务管理订单。独立 worker 进程处理数据库 outbox，邮件与飞书失败不影响业务提交。两者使用同一代码库和数据库，不拆微服务。

**Tech Stack:** 推荐 TypeScript、Next.js App Router、React、CSS Modules、PostgreSQL、node-postgres (`pg`)、Zod、Luxon、Nodemailer、Sharp、Vitest、Playwright。开发基线建议 Node.js 24 LTS、pnpm 10、PostgreSQL 17；具体依赖补丁版本在首次安装时核对兼容和安全公告后锁定，禁止生产浮动 `latest`。这是本计划的技术建议，不冒称之前已选型。

**Spec:** [已确认业务设计](../specs/2026-09-20-chonghub-manual-fulfillment-design.md)。执行者先读设计全文及本计划；视觉参考是该文档的四张图片，业务文字以设计文档为准。

## Global Constraints

- 首版售价：Plus 月卡 14500 分、Pro 5X 月卡 75000 分、Pro 20X 月卡 135000 分；Go、Team、iOS续订及其他品类不发布。
- 初筛只在浏览器内进行；真实会话原文不上传、不保存、不写日志、不用于调用接口。不得读取用户 Downloads 中真实凭证制作测试。
- 仅人工交付，不接在线支付、不接上游接口、不发自动充值请求。
- 邮箱验证码登录，首次验证自动注册；游客能提交、查单及申请售后。
- 单管理员账号，服务器端鉴权；不实现多员工权限产品。
- 时区 Asia/Shanghai，营业时间09:30–23:00，收款确认且资料齐全后累计两个营业小时交付。
- 从实际充值成功起算30个自然日保障，按实付金额与核实剩余时长计算退款，累计不超实付。
- 微信客服流风；使用设计资产中的原二维码；`wxid_7ccixhrr9gtk22` 未验证可搜索性，复制微信号入口默认关闭。
- 商品、价格、服务规则来自数据服务；历史订单保存快照，不随商品编辑变化。
- 管理员飞书群通知、用户邮件通知；无真实配置时使用本地接收器，不伪称真实发送成功。
- 保留仓库既有未提交文件；不执行目录整体覆盖、清理或批量提交。

## 0. 分阶段交付与执行方式

| 阶段 | 任务 | 可独立验收结果 |
| --- | --- | --- |
| A 商品与规则 | 1–2 | 可运行的商品网站，价格源于数据库，时效／退款／初筛规则有测试 |
| B 用户业务 | 3–5 | 邮箱登录、游客提交／查单、初筛、微信引导和订单列表 |
| C 人工运营 | 6–8 | 单管理员移动后台、售后、附件、可靠通知和本地完整闭环 |

每项先实现小测试并观察失败，再添加功能、运行同项验证。页面排版不逐像素写单测，身份、金额、时效、事务与凭证边界必须测试。任务结尾进行独立代码审查；Git 提交仅在取得提交授权后执行，不把计划中的勾选当作完成证据。

## 1. 文件地图

以下均为拟创建路径；当前仓库只有初始化文件与设计资料，没有可复用业务代码。

```text
src/
  app/
    layout.tsx, globals.css, error.tsx, not-found.tsx
    (site)/page.tsx
    (site)/products/[slug]/page.tsx
    (site)/guide/page.tsx
    (site)/privacy/page.tsx
    (site)/terms/page.tsx
    (site)/login/page.tsx
    (site)/requests/new/page.tsx
    (site)/requests/[number]/screening/page.tsx
    (site)/requests/[number]/contact/page.tsx
    (site)/guest/orders/page.tsx
    (site)/me/page.tsx
    (site)/me/after-sales/page.tsx
    (site)/me/account/page.tsx
    (site)/orders/[number]/page.tsx
    (site)/orders/[number]/after-sales/page.tsx
    admin/layout.tsx, admin/page.tsx
    admin/products/page.tsx, admin/products/[id]/page.tsx
    admin/orders/page.tsx, admin/orders/[number]/page.tsx
    admin/users/page.tsx, admin/settings/page.tsx
    api/[...path]/route.ts
  components/
    site-header.tsx, product-card.tsx, order-timeline.tsx
    wechat-contact.tsx, status-badges.tsx, admin-shell.tsx
  modules/
    catalog/{contracts,repository,service,seed}.ts
    auth/{contracts,otp,session,guest-grant,access,rate-limit}.ts
    orders/{contracts,create,query,commands,repository,public-view}.ts
    screening/{classify.client,report-schema,screening-form}.tsx
    fulfillment/{business-time,refund,guards}.ts
    after-sales/{contracts,service,attachments}.ts
    notifications/{contracts,outbox,worker,email,feishu,templates}.ts
    settings/{contracts,service}.ts
  server/{db,env,http,router,errors,audit,crypto,storage}.ts
db/migrations/001_core.sql ... 006_operations.sql
scripts/{migrate,seed,worker,bootstrap-admin}.ts
tests/{unit,integration,e2e}/
tests/support/{database,http,fixtures,clock,mail}.ts
compose.dev.yml, Dockerfile, compose.yml
.env.example, .gitignore, package.json, pnpm-lock.yaml
tsconfig.json, next.config.ts, eslint.config.mjs
vitest.config.ts, playwright.config.ts
docs/operations/local-development.md
docs/operations/production-handoff.md
```

`api/[...path]/route.ts` 仅负责分派：独立模块提供 handler；不得在一个文件中堆叠所有业务。初筛纯逻辑及 schema 实际使用 `.ts`，表单使用 `.tsx`。服务端模块标记 `server-only`，禁止被客户端依赖。

## 2. 跨模块契约

创建 `src/modules/orders/contracts.ts`，公开接口以如下名字和单位为准：

```ts
export type Money = number; // safe integer, CNY cents, >= 0
export type Actor =
  | { kind: 'user'; userId: string }
  | { kind: 'guest'; orderId: string; grantVersion: number }
  | { kind: 'admin'; userId: string };
export type PaymentStatus = 'unpaid' | 'paid' | 'partial_refund' | 'refunded';
export type DeliveryStatus = 'pending_confirmation' | 'pending' | 'needs_info'
  | 'processing' | 'completed' | 'cancelled';
export type ScreeningStatus = 'unchecked' | 'passed' | 'subscribed' | 'invalid' | 'unknown';
export interface ServicePolicy {
  version: number;
  zone: 'Asia/Shanghai';
  opensAt: string; // HH:mm
  closesAt: string; // HH:mm, same day, opensAt < closesAt
  deliveryMinutes: number;
  warrantyDays: number;
  termsVersion: string;
}
export interface CreateRequestInput {
  skuId: string;
  contactEmail: string;
  declaredSubscription: 'free' | 'subscribed' | 'unknown';
  note: string;
  guestPassword?: string;
}
export interface OrderSnapshot {
  productName: string;
  skuName: string;
  displayPriceCents: Money;
  eligibilityText: string;
  warrantyText: string;
  screening: 'gpt_session' | 'none';
  policy: ServicePolicy;
}
export interface PublicOrder {
  number: string;
  snapshot: OrderSnapshot;
  quotedPriceCents: Money | null;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  screeningStatus: ScreeningStatus;
  dueAt: string | null;
  completedAt: string | null;
  warrantyEndsAt: string | null;
  refundCents: Money;
  timeline: Array<{ at: string; message: string }>;
  version: number;
}
```

接口统一 `{ data: value }` 或 `{ error: { code, message, requestId } }`；400格式错误、401需验证、403权限不足、404不存在／不可见资源、409过期版本或幂等冲突、413过大、429限频、503基础设施不可用。不能把SQL、邮件密钥、正文或会话输入写入响应。

HTTP 写请求验证 Origin 为 `APP_ORIGIN`，同站 Cookie＋CSRF token，读取敏感资源 `Cache-Control: no-store`。分页大小默认20、最大100，游标包含时间与ID；排序字段白名单，SQL参数化。

### 数据与唯一性

| 表 | 关键字段与约束 |
| --- | --- |
| categories/products/skus | UUID主键、唯一slug、草稿／上架／下架；SKU price_cents整数且非负；product与sku均上架才可购买 |
| users | canonical_email唯一、verified_at；只有已验证邮箱才归并历史单 |
| admin_identity | 单行主键固定为1、user_id唯一；仅本地管理脚本初始化，注册接口不能写 |
| otp_challenges | purpose、email、HMAC摘要、expires_at、attempts、consumed_at；码不明文入库 |
| sessions/guest_grants | 随机token的摘要、过期时间；guest关联order及grant_version |
| orders | UUID、随机公开单号唯一、owner_user_id可空、联系邮箱、游客密码散列、snapshot JSONB、报价、独立状态、version、计时和完成字段 |
| screening_reports | order_id、status、plan_type枚举、rule_version、服务端时间，不设原始输入列 |
| order_commands | (order_id, idempotency_key)唯一、body_digest、result JSONB |
| create_keys | (actor_scope, key)唯一；游客scope使用服务端HttpOnly草稿cookie，不使用邮箱作为访问凭据 |
| receipts/refunds | 金额分、实际时间、交易参考号、order_id、关联售后；订单锁内约束累计金额 |
| quotes/order_events/audit_events | 追加历史；客户消息与内部备注分字段，不直接返回整行对象 |
| after_sales/attachments | 订单外键、独立售后状态；附件随机存储键、MIME、尺寸、上传者、私有访问 |
| outbox | event_id、channel、唯一dedupe_key、payload、状态、租约、次数、重试时间 |
| site_settings | revision、客服与公开说明；敏感字段独立加密，不进入公开DTO |
| rate_limits | key摘要＋window_start唯一、计数原子更新，所有web实例共享 |

所有财务命令在同一数据库连接的事务中锁定订单；事务内同时写业务结果、审计与outbox。网络请求不得放进事务。使用参数化SQL和外键，公开单号不可作为认证令牌。

## Task 1: 可运行商品站与数据库基础（阶段A）

**Files:** 创建根目录配置、`src/server/{env,db,errors,http,router}.ts`、`db/migrations/001_core.sql`、`scripts/{migrate,seed}.ts`、`src/modules/catalog/{contracts,repository,service,seed}.ts`、`src/app/layout.tsx`、`src/app/globals.css`、首页及商品详情／guide／privacy／terms页面、`src/components/{site-header,product-card}.tsx`。修改 `README.md`，不覆盖原有项目说明。测试 `tests/integration/catalog.test.ts`。

**Interfaces:** `listPublishedProducts(): Promise<ProductView[]>`；`getPublishedProduct(slug: string): Promise<ProductView | null>`。`ProductView={id,slug,name,description,skus:Array<{id,name,priceCents,eligibilityText}>}`，绝不包含成本。`withTransaction<T>(fn: (client: PoolClient)=>Promise<T>):Promise<T>`。

- [ ] 添加应用和测试依赖、脚本及本地Compose：数据库只映射到127.0.0.1，本地邮件接收器仅开发使用。先检查现有文件再创建，禁止在仓库根运行覆盖式脚手架。
- [ ] 配置脚本：`dev=next dev`、`build=next build`、`start=next start`、`typecheck=tsc --noEmit`、`lint=eslint .`、`test=vitest run`、`test:e2e=playwright test`、`db:migrate=tsx scripts/migrate.ts`、`db:seed=tsx scripts/seed.ts`、`worker=tsx scripts/worker.ts`。迁移使用 `schema_migrations` 表及数据库advisory lock，已执行文件校验和变化时拒绝继续。
- [ ] 编写并运行以下集成测试；最初应因缺少查询功能失败。数据库测试使用 `TEST_DATABASE_URL`，数据库名必须以 `_test` 结尾；拒绝清理非测试数据库。

```ts
import { test, expect } from 'vitest';
import { listPublishedProducts } from '../../src/modules/catalog/service';
test('only publishes the three approved prices', async () => {
  const products = await listPublishedProducts();
  expect(products.flatMap(p => p.skus.map(s => s.priceCents)).sort((a,b)=>a-b))
    .toEqual([14500, 75000, 135000]);
  expect(JSON.stringify(products)).not.toMatch(/upstream|costCents/);
});
```

- [ ] 建商品、规格和设置表；seed首次创建三个商品及月卡规格，再次执行不得重置管理员已修改的价格。初始售后文本和时段复制设计文档已确认内容；未核实权益不编造。
- [ ] 数据库事务最小骨架：

```ts
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const result = await fn(client);
  await client.query('COMMIT');
  return result;
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

- [ ] 首页与详情SSR读数据库；初期不缓存商品查询，避免改价滞后。复制已保存的客服二维码到 `public/images/customer-service-wechat.jpg`，不使用生成图中的二维码。
- [ ] 定义CSS变量 `--canvas:#f7f8fa; --surface:#fff; --ink:#172b34; --primary:#087f75; --radius:12px`；320px起不横向滚动，1440px内容居中；无虚假销量与支付按钮。
- [ ] 验证：`pnpm test tests/integration/catalog.test.ts`、`pnpm typecheck`、`pnpm build`。数据库不可用时显示服务暂不可用，不能静默改用内存假商品。

**阶段验收：** 本地可浏览真实数据库商品；停售商品返回404；开发服务条款标记草案，生产发布门禁要求经营主体资料完成。

## Task 2: 初筛、营业计时与退款纯规则（阶段A）

**Files:** `src/modules/screening/classify.client.ts`、`src/modules/screening/report-schema.ts`、`src/modules/fulfillment/{business-time,refund,guards}.ts`、`src/modules/orders/contracts.ts`；测试 `tests/unit/{screening,business-time,refund}.test.ts`。

**Interfaces:** `classifySession(raw:string, nowMs:number):ScreeningReport`；`ScreeningReport={status:'passed'|'subscribed'|'invalid'|'unknown',planType:'free'|'prolite'|'unknown',reason:'format'|'missing_login'|'expired'|'missing_fields'|'unknown_plan'|'free'|'subscribed',ruleVersion:1}`。`calculateDueAt(start:Date,policy:ServicePolicy):Date`；`refundTargetCents(paid:number,remainingMs:number,warrantyMs:number):number`。

- [ ] 用固定时间及合成字符串写失败测试，禁止粘贴真实令牌：

```ts
test('free is preliminary only; unknown does not pass', () => {
  const base = { user:{id:'fake-user'}, account:{id:'fake-account',planType:'free'},
    accessToken:'SYNTHETIC-ONLY', expires:'2030-01-01T00:00:00Z' };
  expect(classifySession(JSON.stringify(base),Date.parse('2026-09-20')))
    .toMatchObject({status:'passed',planType:'free'});
  base.account.planType='unrecognized';
  expect(classifySession(JSON.stringify(base),Date.parse('2026-09-20')).status).toBe('unknown');
  expect(classifySession('{"WARNING_BANNER":"notice"}',0).status).toBe('invalid');
});
test('counts only operating time', () => {
  const p = {version:1,zone:'Asia/Shanghai',opensAt:'09:30',closesAt:'23:00',
    deliveryMinutes:120,warrantyDays:30,termsVersion:'v1'} as const;
  expect(calculateDueAt(new Date('2026-09-20T22:30:00+08:00'),p).toISOString())
    .toBe('2026-09-21T03:00:00.000Z');
  expect(calculateDueAt(new Date('2026-09-20T23:30:00+08:00'),p).toISOString())
    .toBe('2026-09-21T03:30:00.000Z');
});
test('refund uses paid cents and natural duration', () => {
  expect(refundTargetCents(14500,15*86400000,30*86400000)).toBe(7250);
  expect(refundTargetCents(14500,-1,30*86400000)).toBe(0);
});
```

- [ ] `pnpm test tests/unit`，先观察业务断言失败；再实现规则。初筛限制输入64KiB，要求对象、非空user.id/account.id/accessToken及可解析expires；不要求所有样例偶然出现的字段。过期返回invalid，缺少可判定信息返回unknown，只有free可通过；返回对象不带原字段。
- [ ] 时效算法使用Luxon在policy.zone计算当日开闭时间：早于开门移至开门、达到关门移至次日开门、扣除当日可用分钟后继续次日；剩余分钟为0时返回终点。验证时段同日且非空，分钟正整数，禁止死循环。金额用安全整数，退款舍入用BigInt避免浮点边界：

```ts
const bounded = Math.max(0, Math.min(remainingMs, warrantyMs));
const numerator = BigInt(paid) * BigInt(bounded);
const denominator = BigInt(warrantyMs);
return Number((2n * numerator + denominator) / (2n * denominator));
```

- [ ] 补测空输入、数组、超大输入、prolite、缺失expires、恰好到期；计时09:30、23:00、跨月；退款恰好半分、30天上限、非法整数拒绝。运行上述3个单元文件，预期全通过。

## Task 3: 邮箱身份与游客访问（阶段B）

**Files:** `db/migrations/002_identity.sql`、`src/modules/auth/{contracts,otp,session,guest-grant,access,rate-limit}.ts`、`src/server/crypto.ts`、`scripts/bootstrap-admin.ts`、登录和游客查单页面、`tests/integration/auth.test.ts`。

**Interfaces:** `sendOtp(email:string,purpose:'login'|'guest_reset',orderNumber?:string):Promise<void>`；`verifyLogin(email:string,code:string):Promise<{userId:string,sessionToken:string}>`；`readActor(request:Request):Promise<Actor|null>`；`authorizeOrder(actor:Actor,orderId:string):Promise<void>`。OTP邮件先写outbox，Task 8接通发送；本地测试fake sender读取事件，不输出明文到日志。

- [ ] 新建身份表、默认拒绝的访问校验；先测试验证码单次消费和错误身份访问。`tests/support/database.ts` 导出 `resetTestDatabase()`、`seedUser(email)`；`tests/support/mail.ts` 导出 `lastOtp(email)`，只允许测试环境解密本地邮件事件。

```ts
test('a login code is consumed once', async () => {
  await sendOtp('buyer@example.test','login');
  const code = await lastOtp('buyer@example.test');
  const first = await verifyLogin('buyer@example.test',code);
  expect(first.userId).toBeTruthy();
  await expect(verifyLogin('buyer@example.test',code)).rejects.toMatchObject({code:'INVALID_CODE'});
});
```

- [ ] 执行 `pnpm test tests/integration/auth.test.ts` 后实现：6位密码学随机验证码，10分钟有效，60秒重发间隔，每邮箱每小时5次、每IP每小时20次、每challenge最多5次尝试；数据库原子计数，失败尝试必须提交。验证码摘要采用服务端密钥HMAC，最新有效challenge独占一次消费。
- [ ] 邮箱trim、lowercase，不删除点号或加号。登录事务内消费OTP、upsert用户、归并owner为空且联系邮箱匹配的订单。bootstrap脚本指定已验证用户后写单行admin_identity；后台修改管理员邮箱要求新邮箱验证，不能通过普通设置字段直接授予权限。
- [ ] 会话token随机32字节、只保存SHA-256摘要；生产Cookie `HttpOnly; Secure; SameSite=Lax; Path=/`，普通用户7天、管理员12小时，登出撤销。游客密码12–128字符，scrypt随机salt及固定参数（N=32768,r=8,p=1,maxmem=64MiB），比较用timingSafeEqual；游客grant24小时且限定一个订单。
- [ ] 迁移002同时创建基础outbox（Task 8所列字段），以便OTP事件可落库；订单归并SQL及guest_grants订单外键在迁移003建立orders后启用，Task 3只验证身份本身，不查询尚不存在的订单表。迁移006只补充通知投递配置及索引。
- [ ] 游客登录以单号＋密码交换grant cookie，不能在URL放密码。找回向订单原联系邮箱发验证码；重设密码递增grant_version、撤销旧grant。订单已绑定用户后，作废游客凭据，统一要求邮箱登录，避免旧凭据继续访问。
- [ ] 补测并发消费仅一次成功、过期码、超限、普通用户冒充管理员失败、游客跨单失败、找回不接受任意替换邮箱。运行同一测试文件及typecheck。

## Task 4: 需求创建、快照与订单查询（阶段B）

**Files:** `db/migrations/003_orders.sql`、`src/modules/orders/{create,query,repository,public-view}.ts`、需求提交／个人中心三页／订单详情页、`src/components/{order-timeline,status-badges}.tsx`、`tests/integration/orders.test.ts`。

**Interfaces:** `createRequest(input:CreateRequestInput,actor:Actor|null,key:string,draftScope:string):Promise<{order:PublicOrder,guestToken?:string}>`；`getPublicOrder(number:string,actor:Actor):Promise<PublicOrder>`；`listMyOrders(actor:Actor,cursor?:string):Promise<{items:PublicOrder[],nextCursor:string|null}>`。

- [ ] 建orders、create_keys、事件表及身份外键；在测试夹具中提供 `createGuestOrder()` 返回 `{number,actor,skuId}`，真实调用createRequest，不能绕开访问规则。

```ts
test('price editing does not alter an existing snapshot', async () => {
  const created = await createGuestOrder();
  await pool.query('UPDATE skus SET price_cents=$1 WHERE id=$2',[19900,created.skuId]);
  expect((await getPublicOrder(created.number,created.actor)).snapshot.displayPriceCents).toBe(14500);
  await expect(getPublicOrder(created.number,{kind:'user',userId:crypto.randomUUID()}))
    .rejects.toMatchObject({code:'NOT_FOUND'});
});
```

- [ ] 运行测试后实现：提交事务锁读SKU并确认可售，服务端生成随机单号、快照与规则；不能相信客户端价格。联系邮箱和备注分别限制254／2000字符；游客密码必填、登录用户无此字段。
- [ ] 创建幂等键由表单生成UUID，scope为登录用户或服务端随机草稿cookie。重复相同key相同payload返回原单；不同payload返回409；新浏览器不能凭key获得旧单。成功后创建限定订单的guest grant，不在public DTO里返回密码摘要。
- [ ] 幂等记录不保存请求原文；包含查询密码的创建请求摘要使用服务端密钥HMAC，禁止将密码写入JSONB结果。已验证用户绑定订单的归并与游客grant作废在本任务事务内接通。
- [ ] PublicOrder采用字段白名单映射，不把数据库行spread进响应。客户时间线只读visibility=customer，管理员内部记录另表或明确隔离。分页绑定owner，所有按单号访问先鉴权。
- [ ] 提交后跳转初筛页；邮件保存单号与无凭据查询入口。查单失败保持统一提示。个人中心空态展示“查看套餐”，不塞模拟订单。
- [ ] 验证重复提交只一单、停售并发返回409且不建单、快照完整、所有敏感字段不返回、绑定后旧grant失效；运行 `pnpm test tests/integration/orders.test.ts`。

## Task 5: 初筛页面、微信引导及用户补充（阶段B）

**Files:** `src/modules/screening/screening-form.tsx`、`src/modules/orders/commands.ts`（先添加报告与客户补充命令）、初筛／联系页面、`src/components/wechat-contact.tsx`、`tests/e2e/screening.spec.ts`。

**Interfaces:** `recordScreening(orderId:string,actor:Actor,report:ScreeningReport,key:string):Promise<void>`；`addCustomerMessage(orderId:string,actor:Actor,message:string,key:string):Promise<void>`。

- [ ] 写浏览器测试：预建一张测试游客单并登录，监听所有后续请求，合成token不得外发：

```ts
const bodies: string[]=[];
page.on('request',r=>bodies.push(r.postData() ?? ''));
await page.getByLabel('会话信息').fill(JSON.stringify({user:{id:'fake'},
  account:{id:'fake',planType:'free'},accessToken:'NEVER-SEND-SYNTHETIC',
  expires:'2030-01-01T00:00:00Z'}));
await page.getByRole('button',{name:'开始初筛'}).click();
await expect(page.getByText('初步校验通过',{exact:true})).toBeVisible();
expect(bodies.join('\n')).not.toContain('NEVER-SEND-SYNTHETIC');
await expect(page.getByLabel('会话信息')).toHaveValue('');
```

- [ ] 运行 `pnpm test:e2e tests/e2e/screening.spec.ts`。使用受控textarea、`autoComplete="off"`，onClick调用本地classify，`finally`清空state和DOM值；不使用会自动提交textarea的form action；禁止该页第三方脚本、回放、输入日志和service worker离线缓存。
- [ ] 后端报告schema严格拒绝额外字段，planType只允许free/prolite/unknown，32字节内等固定约束；限制HTTP正文为4KiB；无法完全阻止恶意客户端向任何HTTP服务发送数据，因此入口不得记录正文，即使校验失败也只记错误码。
- [ ] 初次通过写去重事件 `order:{id}:screening:first-pass`；重试不重复通知。报告不会修改收款或人工确认。失败保留重试与咨询；通过显示单号和真实二维码、复制咨询内容。微信搜索标识未确认前隐藏复制微信号按钮。
- [ ] 添加站内补充文本入口，仅收一般说明，明确不要填写凭证；需授权订单、限频，每条补充生成独立通知事件。初筛原文不成为任何补充消息默认值。
- [ ] 同页测试三类样例、unknown/过期、刷新重新验证权限、清空localStorage/sessionStorage中无token、复制内容不含凭证。阶段B可在本地测试邮件接收器登录并全程查单。

## Task 6: 单管理员商品、报价与交付后台（阶段C）

**Files:** `db/migrations/004_operations.sql`、`src/modules/orders/commands.ts`、`src/server/audit.ts`、`src/modules/settings/{contracts,service}.ts`、全部admin页面与`admin-shell.tsx`、`tests/integration/admin-orders.test.ts`。

**Interfaces:** `executeAdminCommand(number:string,actor:Actor,command:AdminCommand,key:string,expectedVersion:number):Promise<PublicOrder>`。AdminCommand为严格判别联合：`confirm_quote {priceCents,customerConfirmedAt}`、`confirm_receipt {amountCents,receivedAt,reference}`、`confirm_materials {}`、`start_processing {}`、`needs_info {message}`、`complete {successAt,result}`、`cancel {reason}`、`add_note {text,visibility:'internal'|'customer'}`。时间ISO8601；successAt不可晚于服务器当前时间。

- [ ] 测试先验证不充分条件不能开始交付：

```ts
test('a client screening report never authorizes fulfillment', async () => {
  const order = await createGuestOrder();
  await expect(executeAdminCommand(order.number,await adminActor(),
    {type:'start_processing'},crypto.randomUUID(),0))
    .rejects.toMatchObject({code:'NOT_READY'});
});
```

- [ ] 执行 `pnpm test tests/integration/admin-orders.test.ts`。实现每个命令事务：鉴权 → 锁订单 → 查key及摘要（重复正确key先返回既有结果）→ 校验version → 校验状态与金额 → 写变更、audit、outbox → version+1 → commit。不同命令复用key返回409，重复成功命令不因旧version误失败。
- [ ] 首版每单一笔足额收款，amount必须等于已确认报价；退款不会抹除收款。报价在收款后锁定，避免重算历史成交额；补款场景不在首版自动处理范围。资料齐全时间使用服务端时间，付款实际时间与核实时间分开记录。
- [ ] readyAt首次满足“人工确认＋成交价＋收款确认＋资料齐全”时锁定，并调用calculateDueAt；状态切换不重置。完成时记录实际充值成功时间与warrantyEndsAt。取消已付单新增退款待办，收款状态不自动改为已退款。
- [ ] 商品后台含价格、规格、分类、排序、发布校验与预览；人工模式之外拒绝发布。用户管理仅后台可见，数据分页；公开设置只返回客服、时段和文本。敏感通知设置只显示是否配置及尾部标识，更新时加密。
- [ ] 手机采用待办卡片、单列订单段落、底部操作按钮；登记收款／退款／完成弹确认层展示单号、金额或结果。所有编辑携带version，409提示刷新，不覆盖他端变更。
- [ ] 补测并发两次收款仅一笔、不同key重复收款拒绝、readyAt不可重置、更新设置不改旧dueAt、未授权后台403、查询SQL注入输入、管理员看得到内部备注而用户看不到。工作台计数由查询得出，不硬编码。

## Task 7: 售后、退款与私有附件（阶段C）

**Files:** `db/migrations/005_after_sales.sql`、`src/modules/after-sales/{contracts,service,attachments}.ts`、`src/server/storage.ts`、售后页面和后台订单售后区、`tests/integration/after-sales.test.ts`。

**Interfaces:** `openAfterSale(number:string,actor:Actor,input:{type:'subscription_lost'|'delivery_issue'|'other',description:string},key:string):Promise<{id:string}>`；`recordRefund(caseId:string,admin:Actor,input:{amountCents:number,refundedAt:string,reference:string,verifiedLossAt?:string},key:string,version:number):Promise<void>`；`readAttachment(id:string,actor:Actor):Promise<{bytes:Buffer,mime:string}>`。

- [ ] 测试：完成一笔14500分订单，掉订阅为成功后15天，建议7250；两笔并发退款合计超过实付时至多一笔成功。测试未拥有订单的用户读附件返回404。
- [ ] 执行 `pnpm test tests/integration/after-sales.test.ts`；实现售后独立状态和事件，一个订单同一时刻仅一张未关闭售后单，重复提交返回已有单或409解释。
- [ ] 退款计算使用原实付、原保障规则与核实lossAt；同一事件建议目标额需减去该事件已退金额，并受整单剩余可退额约束。锁订单和售后单后校验，金额正整数。区分登记实际退款与计算建议，不调用任何支付接口。非掉订阅问题由管理员输入原因与金额并受实付上限约束。
- [ ] 上游赔付单独记录金额与时间，不能自动增加用户退款。close／resolve仅改变售后状态，不重写交付时间。
- [ ] 附件限制JPEG/PNG/WebP、每张5MiB、每售后最多3张，禁止SVG；按内容解码校验、像素上限20MP，用Sharp重新编码剥离元数据。文件先写临时目录验证再原子移入私有目录，失败清理本次临时文件。数据库保存随机UUID键，不采用用户文件名作路径。
- [ ] 私有附件通过鉴权接口读取、no-store与nosniff；无公共目录或长期公开URL。只在数据保留规则经确定后启用自动清理，首版不擅自永久删除售后凭据。
- [ ] 完成售后申请与进度UI、二维码联系；模拟损坏文件、伪造MIME、路径穿越、超大图片、跨单访问和重复退款验证通过。

## Task 8: 通知、全流程验收与部署交接（阶段C）

**Files:** `db/migrations/006_notifications.sql`、`src/modules/notifications/{contracts,outbox,worker,email,feishu,templates}.ts`、`scripts/worker.ts`、`Dockerfile`、`compose.yml`、两份operations文档、`tests/integration/notifications.test.ts`、`tests/e2e/{guest-flow,member-flow,admin-mobile}.spec.ts`。

**Interfaces:** `enqueueEvent(tx:PoolClient,input:{dedupeKey:string,channel:'email'|'feishu',type:string,payload:Record<string,unknown>}):Promise<void>`；`deliverBatch(now:Date):Promise<{sent:number,failed:number}>`。type用封闭枚举：otp/request_created/screening_passed/customer_message/delivery_completed/after_sale_opened/after_sale_resolved；各type独立schema，禁止通用整订单对象作为payload。

- [ ] 新建支持有租约重试的outbox；身份任务需要的表结构在Task 3已建，迁移006只能增量补充索引及worker字段，不重复建表。OTP事件正文若需要持久化使用AES-256-GCM密钥加密，发出或过期后擦除验证码payload；身份表仅留HMAC摘要。
- [ ] 测试fake sender首次失败次次成功，不回滚需求单；重复enqueue的dedupeKey只有一条。`tests/support/mail.ts`只读取本地fake transport，不访问生产邮件。

```ts
test('failed transport leaves the request intact', async () => {
  const fixture = await createGuestOrder();
  fakeSender.failNext();
  await deliverBatch(new Date('2026-09-20T01:00:00Z'));
  expect(await getPublicOrder(fixture.number,fixture.actor)).toBeTruthy();
  fakeSender.succeed();
  await deliverBatch(new Date('2026-09-20T01:10:00Z'));
  expect(await outboxCountByState('sent')).toBeGreaterThan(0);
});
```

- [ ] worker用 `FOR UPDATE SKIP LOCKED` 小批量领取，写lease_until后提交，再调用网络；失败按1、5、15、60、180分钟重试，超限进入failed待管理员重试，租约过期可恢复。外部网络投递属于至少一次，发送成功后进程崩溃仍可能重复通知；消息包含事件标识，不能宣称端到端exactly-once。
- [ ] SMTP实现按模板发送；worker验证OTP未过期再发。飞书机器人按官方文档签名校验，限定HTTPS官方webhook主机，禁重定向防SSRF；检查HTTP状态及业务返回码，密钥只在服务端。测试默认fake或本地邮件接收器，真实群测试须用户指定测试群并授权发送。
- [ ] e2e覆盖游客提交→本地初筛→微信联系→后台确认报价／核款／资料→完成→用户查询→售后退款，以及验证码用户归并历史订单。桌面1440和手机390×844均完成关键操作；检查320px无溢出、键盘焦点、表单错误、按钮标签和状态颜色之外的文字提示。
- [ ] 全量验证：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm test:e2e`、`pnpm build`、`git diff --check`。仅在新变更或失败后重复相关检查，不把测试通过称为生产验证。
- [ ] 写本地启动、迁移、seed、管理员初始化和worker说明。生产建议web＋worker＋PostgreSQL，私有附件独立持久卷，数据库不暴露公网；密钥由部署环境注入；提供备份和在独立数据库恢复验证步骤。
- [ ] 发布门禁：SMTP域名认证、管理员邮箱、飞书配置、二维码真机识别、正式条款、数据保留规则及部署备份确认后才开公网。无配置时本地开发可继续，但生产不得使用测试邮件模式或演示数据。
- [ ] 回退：暂停接单，停worker，恢复上一应用镜像；数据库优先前向修复，已有订单禁止破坏性down迁移。需要恢复备份时先停止写入并核对恢复点之后的订单，不自动覆盖线上数据库。

## HTTP 路由清单

所有路由映射至 `src/server/router.ts` 的明确处理器表，不动态执行用户提供的路径。

| 路由 | 权限／用途 |
| --- | --- |
| GET /api/products、/api/products/:slug | 公开已发布商品 |
| GET /api/settings/public | 公开设置白名单 |
| POST /api/auth/otp、/api/auth/verify、/api/auth/logout | 邮箱验证码和会话 |
| POST /api/guest/access、/api/guest/reset/request、/api/guest/reset/confirm | 单号密码验证、邮箱找回 |
| POST /api/orders | 登录或游客创建，创建幂等键 |
| GET /api/orders/:number | 所有者或对应guest grant |
| GET /api/me/orders、/api/me/after-sales、/api/me | 已登录本人 |
| POST /api/orders/:number/screening、/messages | 订单权限；严格报告／补充schema |
| POST /api/orders/:number/after-sales | 本人售后申请 |
| GET /api/orders/:number/after-sales | 本人售后详情 |
| POST /api/after-sales/:id/attachments | 限订单权限和附件数量 |
| GET /api/attachments/:id | 私有附件授权读取 |
| GET /api/admin/dashboard、/products、/orders、/users、/settings | 仅管理员，独立后台DTO |
| POST /api/admin/products | 创建草稿 |
| PATCH /api/admin/products/:id | 商品与套餐编辑，版本校验 |
| POST /api/admin/products/:id/publish | 发布前校验 |
| POST /api/admin/orders/:number/commands | 人工报价、收款和交付命令 |
| PATCH /api/admin/after-sales/:id | 状态及结果更新 |
| POST /api/admin/after-sales/:id/refunds、/compensations | 用户退款登记／上游赔付登记 |
| PATCH /api/admin/settings | 可编辑配置；不能直接授予管理员身份 |
| POST /api/admin/notifications/:id/retry | 仅失败通知重试，审计 |

## 环境与测试支撑契约

`.env.example` 只包含以下变量名及本地安全示例，不包含用户真实配置：

```dotenv
APP_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://chonghub:local-dev-only@127.0.0.1:5432/chonghub_dev
TEST_DATABASE_URL=postgresql://chonghub:local-dev-only@127.0.0.1:5432/chonghub_test
MAIL_TRANSPORT=local
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM=ChongHub <noreply@example.test>
AUTH_HMAC_KEY=
SETTINGS_ENCRYPTION_KEY=
PRIVATE_STORAGE_DIR=./var/private
```

开发启动前在本地生成两枚独立随机32字节密钥，以环境变量注入；程序检查缺失或长度不足时拒绝启动，不能回退常量。生产禁止MAIL_TRANSPORT=local；飞书webhook和签名密钥可由后台加密设置维护。`.gitignore` 覆盖 `.env*`（放行example）、`var/`、测试附件、测试报告和浏览器会话文件。

初始seed商品slug固定为 `chatgpt-plus-monthly`、`chatgpt-pro-5x-monthly`、`chatgpt-pro-20x-monthly`，每个一个月卡SKU，初始检查方式gpt_session。后续seed只补缺失项，不覆盖既有发布配置。

测试支撑函数须在使用它们的同一任务创建，不得用不存在的夹具让测试看似完整：

| 导出／文件 | 具体行为 |
| --- | --- |
| resetTestDatabase() / support/database.ts | 检查数据库名_test后清理该测试库、执行全部已创建迁移、运行幂等seed；集成测试串行运行 |
| seedUser(email) / support/fixtures.ts | 创建已验证的虚拟用户，返回UUID，邮箱只能使用example.test |
| createGuestOrder() / support/fixtures.ts | 调用createRequest，使用Plus SKU、虚拟邮箱、12位以上测试密码、随机key；返回单号、SKU、从真实grant验证所得actor |
| adminActor() / support/fixtures.ts | 测试库初始化唯一admin_identity，返回该用户admin actor |
| lastOtp(email) / support/mail.ts | 只在测试进程读取／解密未过期的本地OTP事件；生产模块不得导入 |
| fakeSender / support/mail.ts | failNext()令下一次投递抛出TransportError；succeed()恢复接收；接收结果存测试内存 |
| outboxCountByState(state) / support/database.ts | 通过测试pool计数指定状态，不修改业务状态 |
| frozenClock / support/clock.ts | 所有发送、重试与创建夹具共享固定时钟；避免事件生成于真实现在而测试worker运行于过去 |

测试代码块中 `test/expect` 从Vitest导入，`pool` 从server/db导入，其余函数从对应模块与support导入。Playwright测试使用page fixture和expect。测试不以mock替代订单数据库权限或事务；只有邮件／飞书等外部网络使用fake transport。

## 设计覆盖与评审记录

| 设计章节 | 实现任务 |
| --- | --- |
| 1 商品范围、7 定价、13 视觉 | 1、6、8 |
| 2 身份与访问 | 3、4、7 |
| 3 核心流程、4 页面 | 1、3、4、5、6、7 |
| 5 初筛与隐私 | 2、5 |
| 6 状态 | 4、6、7 |
| 8 交付计时、9 退款保障 | 2、6、7 |
| 10 手机后台 | 6、8 |
| 11 客服通知 | 5、8 |
| 12 技术数据边界 | 全部任务 |
| 14 验收、15 上线输入 | 各任务验证及8 |

计划中的安全参数、推荐技术栈、单笔足额收款约束、绑定后游客授权失效和具体URL为实施建议，应随本计划审阅；商品价格、营业时间及其他用户明确确认规则不得自行改动。

## 官方技术参考

- [Next.js 安装与配置](https://nextjs.org/docs/app/getting-started/installation)：采用App Router结构，安装时锁定兼容版本。
- [node-postgres 事务](https://node-postgres.com/features/transactions)：同一个事务使用同一个连接。
- [PostgreSQL SELECT 锁定语义](https://www.postgresql.org/docs/current/sql-select.html)：订单行锁与通知队列领取。
- [飞书自定义机器人](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot)：实施时核对签名、请求及响应规范，本轮未发送消息。

## 执行交接

本文是实现计划，不是已运行的程序。执行前选择：按阶段由子代理实施并审查，或主会话使用executing-plans逐项执行。沿用用户“暂不创建Trellis任务”的决定，不重复请求任务创建；后续如果用户选择Trellis工作流，再建立对应任务。各阶段结束提供实际检查输出摘要、差异及未完成项；未经授权不提交Git或部署。

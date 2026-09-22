# 商品类型与差异化上架

## 目标
让运营上架 ChatGPT/Claude 充值服务以及 Google 等账号商品时，明确区分商品类型；消费者看到与商品匹配的购买流程和交付说明。

## 已确认事实
- 用户已同意创建任务并规划，尚未批准实施。
- categories 已存在，但创建商品默认 chatgpt，且强制 gpt_session 初筛与月卡默认值（packages/core/src/modules/catalog/admin.ts）。
- 公开购买组件无条件要求 ChatGPT 检测（apps/web/src/components/purchase-flow.tsx），详情页硬编码 ChatGPT、月卡与 30 天订阅保障。
- 订单快照记录 screening 与全局售后 policy，创建时间线无条件提示等待账号初筛（packages/core/src/modules/orders/create.ts）。因此仅添加分类下拉框无法支持账号商品。

## 需求
- 分离商品类型（会员充值/账号商品）与所属平台（ChatGPT/Claude/Google），允许同一平台存在不同类型商品。
- 后台上新及编辑展示类型适用的规格、计价单位、受理条件、交付与售后说明。
- 公开目录展示类型，详情和购买流程遵循商品配置，非 ChatGPT 商品不能要求 ChatGPT 授权内容。
- 保持历史订单快照、归档语义及现有 ChatGPT 商品可用性。

## 已确认的范围决策
- 首版账号商品继续微信人工交付；暂不实现凭据库存、自动发货、自动库存扣减和在线支付。自动交付与支付资质完成后另开改造任务。
- 账号商品和不同充值服务的售后规则应独立配置，不自动套用订阅剩余天数退款。

## 初步验收
- 可上架 ChatGPT 充值、Claude 充值和 Google 账号并正确区分类型/平台。
- Google 账号下单无需 ChatGPT 检测，订单不显示等待 ChatGPT 初筛。
- 公开文案和价格单位不再一律使用 ChatGPT/月卡；售后规则与商品一致。
- 已有商品与历史订单行为保持兼容。

## 暂不纳入
在线支付、账号凭据库存、自动发货、自动库存扣减、多角色权限。

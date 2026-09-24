# ChongHub SEO 基础与内容策略设计

日期：2026-09-23
状态：规划设计，待用户审阅
范围：仅设计与实施规划，不包含产品代码修改、生产部署、推送或外部账号操作。

## 1. 目标

让 ChongHub 能被搜索引擎稳定抓取、正确理解、逐步收录，并承接真实的中文 ChatGPT Plus / Pro 充值搜索需求。

首个 8 周周期只围绕现有三个 ChatGPT 商品和用户购买前的决策问题展开。方案保留真实业务边界，不泄露 ChatGPT 凭证，不承诺无法保证的账号结果。

## 2. 当前事实

- 生产用户端是 `apps/web`；根目录另一套 `src/app` 不作为生产 SEO 实现。
- 当前目录种子包含 ChatGPT Plus、ChatGPT Pro 5X、ChatGPT Pro 20X 三个商品。
- 生产 `APP_ORIGIN` 是 `https://chonghub.com`；Caddy 目前同时服务无 `www` 与 `www` 主机名，没有统一永久重定向。
- 线上 `/sitemap.xml` 返回 404；`/robots.txt` 只有 Cloudflare 内容信号注释，没有 Sitemap 指令。
- `apps/web` 尚未实现 sitemap、robots route、canonical、OG 或 JSON-LD。
- 会话初筛在浏览器本地解析原始 JSON，服务端接收的是版本化的精简初筛报告；SEO 改造不能破坏这个边界。
- 隐私说明和服务条款仍有草案表述，发布信任内容前需要与实际运营规则核对。

## 3. 页面和 URL 架构

可索引页面：

- `/`：品牌入口、服务范围和核心信任信息；
- `/products`：ChatGPT Plus / Pro 套餐选择；
- `/products/[slug]`：单一商品成交页；
- `/guide`：检测、付款、交付和售后说明；
- `/screening`：账号状态检测入口；
- `/articles`：文章目录；
- `/articles/[slug]`：一个搜索意图对应一篇文章。

订单、游客查单、登录、个人中心、后台、API、验证码和请求详情等运营页面不进入 sitemap，并按页面性质设置 noindex 或爬虫限制。

主域名使用 `https://chonghub.com`。`www` 与 HTTP 版本由 Caddy 永久重定向到主域名；应用 metadata、canonical、OG 和 sitemap 全部使用同一个绝对 origin。

## 4. 技术 SEO 设计

### 4.1 站点配置

建立一个类型化站点配置模块，供 metadata、robots、sitemap、JSON-LD 和文章链接共同使用，集中管理：

- canonical origin；
- 站点名称；
- Logo URL；
- 默认描述；
- 默认 OG 图片；
- 本地开发与生产环境的区别。

生产环境不能在 canonical 或 OG 中出现 localhost。

### 4.2 robots 与 sitemap

使用 Next.js metadata route 或等价 app route：

- `robots.ts` 允许公开页面，限制 API、后台、登录、订单和个人中心，并输出 `Sitemap: https://chonghub.com/sitemap.xml`；
- `sitemap.ts` 读取已发布商品和文章，只输出公开、可索引、无查询参数和无片段的 canonical URL；
- 草稿文章、订单号、用户页面、私有接口不进入 sitemap；
- 无法完整读取公开 URL 集合时应失败并报警，不能静默返回不完整 sitemap。

### 4.3 Metadata

根布局提供 `metadataBase`、默认 title 模板、默认描述、OG 默认值和默认 robots；页面覆盖自己的 title、description 和 canonical。

页面意图建议：

| 页面 | Title/H1 方向 |
|---|---|
| 首页 | ChatGPT Plus / Pro 会员充值服务 |
| 商品列表 | ChatGPT Plus / Pro 月卡充值套餐 |
| 商品详情 | 具体商品名、价格、条件与交付 |
| 购买说明 | ChatGPT 充值购买说明：检测、付款与交付 |
| 账号检测 | ChatGPT 账号能否充值？先做状态检测 |

商品详情使用 `generateMetadata`，description 从商品真实数据生成，不能所有商品共用一句话。

### 4.4 结构化数据

- 根布局：`Organization`，只填写真实名称、URL 和可抓取 Logo；
- 商品页和文章页：可见面包屑与 `BreadcrumbList`；
- 单一商品页：根据实时 SKU、CNY 价格和库存输出 `Product` + `Offer`；
- 没有真实评价时不输出 rating；
- 文章只有在作者、发布时间和更新时间真实可维护时才输出 `Article`；
- FAQ 保留正常可见问答，不以 `FAQPage` 富结果作为主要目标。

JSON-LD 序列化必须安全转义 `<` 和 `>`，避免动态商品描述破坏 script 标签。

## 5. 内容架构

首期文章采用版本控制中的 Markdown/MDX，目录为 `apps/web/content/articles`，不立即建设数据库 CMS。

每篇文章的 frontmatter 包含：

```text
slug, title, description, primaryIntent,
publishedAt, updatedAt, author, reviewedBy,
relatedProducts, status
```

`status: published` 才能生成路由、目录入口和 sitemap；草稿不公开。

首批五篇：

1. `chatgpt-topup-safety`：ChatGPT 代充安全吗；
2. `chatgpt-account-ban-risk`：ChatGPT 代充会封号吗；
3. `chatgpt-without-overseas-card`：没有海外信用卡怎么充值；
4. `chatgpt-topup-password`：代充需要提供密码吗；
5. `chatgpt-plus-vs-pro`：Plus 和 Pro 怎么选。

文章必须先给直接答案，再说明当前流程、风险边界、用户自查项和下一步入口。不能承诺绝对安全、绝不封号、官方授权或固定结果，也不能复制竞品说法。

价格、库存、交付时长、保障天数和客服联系方式属于可变业务数据，不在文章中写死；正文链接到商品或购买说明的当前数据。

## 6. 内链和页面职责

- 首页展示少量精选指南；
- `/guide` 链接风险、支付和账号检测文章；
- 商品页链接相关指南和文章；
- 文章链接一个相关商品或 `/products`，并链接 `/guide` 或 `/screening`；
- `/articles` 链接所有已发布文章；
- 每篇已发布文章都必须能从目录和至少一个商业或说明页面到达。

商品页负责成交，购买说明负责规则，账号检测负责行动，文章负责解决更早的疑问。

## 7. 隐私、信任和业务边界

现有初筛流程在浏览器本地解析会话 JSON，检测后清除原始输入，服务端只接收精简报告。SEO 改造不能让 textarea 内容进入统计脚本、错误追踪、日志、邮件、飞书或 JSON-LD。

公开页面应提醒用户不要在备注、客服消息或售后说明中填写密码、令牌或原始会话内容。隐私、条款、退款、保障和联系方式必须先与实际经营主体和履约方式核对。

## 8. 8 周执行顺序

### 第 0 周：基线

确认主域名、Logo、OG 图片、运营规则、URL 清单和 GSC 28/90 天基线。

### 第 1 周：技术基础

完成 Caddy 主域名重定向、站点配置、robots、sitemap、metadata、OG 和结构化数据。

### 第 2 周：线上验证

发布技术改造，验证普通、移动和 Googlebot UA，提交 GSC sitemap，检查核心页面。

### 第 3～5 周：内容

建立文章路由、frontmatter、目录、内链和五篇首批文章，同时更新商品页和购买说明。

### 第 6 周：第一次数据复盘

按收录、查询相关性、曝光、点击、CTR 和排名区间分类处理，不使用固定关键词密度或固定字数指标。

### 第 7 周：可信分发

通过公众号、小红书和真实社区回答分发文章摘要和首页，不购买批量外链、不自动群发。

### 第 8 周：阶段评估

保留、改写、合并或暂缓页面，并制定下一周期选题。

## 9. 验收标准

- `/sitemap.xml` 返回 200、XML 有效，并只包含预期公开 URL；
- `/robots.txt` 返回 200，包含正确绝对 Sitemap；
- `www` 永久重定向到无 `www` 主域名；
- 首页、商品列表、商品详情、购买说明、账号检测和文章都有唯一 metadata 与 canonical；
- Organization、Breadcrumb、Product 数据通过验证，不包含虚构评价或承诺；
- 私有页面不出现在 sitemap；
- 五篇文章完成事实、隐私和业务声明复核；
- 文章、购买说明、账号检测和商品页之间无孤立页面；
- lint、typecheck、build、endpoint、生产抓取和会话信息泄露检查通过；
- GSC 有提交记录和首次复盘记录，但不承诺固定排名或流量。

## 10. 回滚和延期

Caddy 重定向、SEO routes、metadata、JSON-LD 和文章发布分别可回滚。缺陷文章先改为 draft/noindex 或重定向到已验证页面，不直接删除已经收录的 URL。

首期延期内容：数据库 CMS、多语言 hreflang、Codex/invoice/企业采购主题、复杂转化归因，以及没有真实商品或支持流程的关键词页面。

## 11. 外部依据

- [Google Search Essentials](https://developers.google.com/search/docs/essentials)
- [Google Helpful Content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Google Robots.txt specification](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)
- [Google Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product)
- [Google FAQ rich-result changes](https://developers.google.com/search/blog/2023/08/howto-faq-changes)

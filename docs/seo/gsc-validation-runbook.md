# ChongHub SEO edge and GSC validation runbook

这份 runbook 用于上线后建立可复查的 SEO 基线。它不需要 OAuth、浏览器插件或 GSC API；没有授权时，保留“未授权/暂无数据”记录，不把空 CSV 当成没有流量。

## 1. 上线前本地检查

```bash
pnpm dev:local
pnpm dev:local:check
pnpm seo:check -- --target=http://localhost:3000 --label=local
pnpm dev:local:stop
```

`seo:check` 只输出状态、响应头摘要和检查结果，不输出 HTML、Cookie、token、账号内容或购买表单内容。它检查 `/robots.txt`、`/sitemap.xml`、首页、商品页、购买说明、账号检测页，以及 HTTPS 站点的 HTTP/`www` 永久跳转。

## 2. 部署后的边缘检查

在 Cloudflare/Caddy 生效后，从不带登录态的网络运行：

```bash
pnpm seo:check -- --target=https://chonghub.com --label=production
```

把命令输出保存为带日期的记录，并补充以下字段：

| 字段 | 记录内容 |
| --- | --- |
| 检查时间 | Asia/Shanghai 时间和 UTC 时间 |
| 目标 | `https://chonghub.com`、HTTP、`www` |
| User-Agent | 普通浏览器、移动端、Googlebot |
| 期望 | 公开页 200；HTTP/`www` 301 或 308 到 apex HTTPS |
| robots | `Sitemap: https://chonghub.com/sitemap.xml`，没有 `Disallow: /` |
| sitemap | 200、XML、只含 canonical 公开 URL |
| HTML | canonical、`og:title`、`og:description`、JSON-LD |
| 边缘差异 | Cloudflare 是否替换/追加 robots 内容，是否改变 Content-Type |
| 后续动作 | 修复项、负责人、复查日期 |

本地服务通过不等于生产边缘通过。Cloudflare 托管 robots 可能追加内容信号注释，最终以 Googlebot 实际拿到的文本为准。

## 3. GSC 设置和一次性提交

1. 验证 `https://chonghub.com` 属性；若仍使用 `www`，同时记录其验证状态和跳转结果。
2. 在“站点地图”提交一次 `https://chonghub.com/sitemap.xml`。提交后不要为每个 URL 批量重复请求收录。
3. URL 检查并记录：首页、`/products`、一个已发布商品、`/guide`、`/screening`、`/articles`、一篇已发布文章。
4. 每条 URL 检查记录包含：检查时间、覆盖状态、canonical、Google 选择的 canonical、抓取时间、失败原因和下一步。

URL 检查是生产收录证据；本地 HTML、构建成功或 sitemap 存在都不能替代它。sitemap 只是发现 URL 的提示，不保证收录。

## 4. CSV 基线导出

第一次在 GSC “效果”中选择最近 28 天；站点有足够历史后再导出最近 90 天。记录 GSC 显示的最后更新时间，因为数据通常有延迟。分别导出以下维度：

- 查询：query、clicks、impressions、CTR、position
- 网页：page、clicks、impressions、CTR、position
- 日期：date、clicks、impressions、CTR、position
- 国家、设备：用于确认中文流量的地区和设备分布
- “网页编入索引”页面和原因：记录已编入、已发现未编入、已抓取未编入及失败原因

静态 CSV 只代表导出时的时间窗口。保存 `property`、时间范围、时区、导出时间、来源页面和限制说明；删除 Cookie、OAuth 内容、账号信息和原始 ChatGPT 会话数据后再分享。

没有授权或报告为空时使用以下记录：

```text
property: https://chonghub.com
date_range: recent 28 days
source: GSC UI export / not available
status: not authorized | no data yet
limitations: GSC delayed data; static CSV snapshot
next_action: verify property, submit sitemap, retry after 2-3 days
```

## 5. 第 2、4、8 周复盘

| 时间 | 重点 | 触发动作 |
| --- | --- | --- |
| 第 2 周 | 页面是否收录、是否出现目标意图词、是否有曝光 | 未收录先查 URL 检查和内部链接；词意不符则改标题、首屏和页面主题 |
| 第 4 周 | CTR、排名 8–30 的页面、孤立页 | 优先改低 CTR 的 title/description；给有曝光页补相关内链；避免只追第三方搜索量 |
| 第 8 周 | 文章是否带来匹配查询、点击和业务转化 | 保留有效页，重写/合并意图重叠页，暂停没有证据的扩展；记录下一轮假设 |

每一轮都记录页面、查询、曝光、点击、CTR、排名区间、索引状态和动作。不要用固定关键词密度或批量生成数量作为页面成功标准。

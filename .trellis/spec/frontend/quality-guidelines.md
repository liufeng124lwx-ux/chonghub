# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

<!--
Document your project's quality standards here.

Questions to answer:
- What patterns are forbidden?
- What linting rules do you enforce?
- What are your testing requirements?
- What code review standards apply?
-->

(To be filled by the team)

## Purchase Flow Contract

The product detail page owns the short purchase flow. `PurchaseFlow` must keep the
raw ChatGPT session snapshot in browser memory only and send only the constrained
`ScreeningReport` to `POST /api/orders/:number/screening` after the order is created.

- `检测账号` parses locally; `passed` enables purchase, while `subscribed`, `invalid`, and `unknown` remain blocked by validation.
- The purchase button must remain clickable so missing email or detection state is explained in the live status message; it must not silently appear inert.
- A durable order creation response is the source of truth. If report persistence fails, navigate to the order with `detection=pending` and tell the customer to retry detection rather than claiming no order exists or creating a second one.
- `?wechat=1` opens the configured customer-service modal on the order page. The modal must support Escape/backdrop/close-button dismissal and a visible reopen action.
- Browser tests use synthetic session fixtures only; no real credential or session JSON belongs in tests, logs, snapshots, or requests.

### Validation Matrix

| State | Expected behavior |
| --- | --- |
| Empty/invalid email | Stay on product page and announce an actionable email error |
| No report / non-passed report | Stay on product page and announce that account detection must pass |
| Order POST succeeds, report POST fails | Open the created order with a pending-detection notice |
| Existing guest grant buys again | Issue a fresh grant for the new/replayed order; do not reject solely because a prior guest cookie exists |
| Valid order and report | Open order detail and auto-open WeChat modal |

### Product Type Matrix

| Product type | Required UI behavior |
| --- | --- |
| Recharge | Show the ChatGPT session screening controls only when `screening === 'gpt_session'`; keep the constrained screening report flow. |
| Account | Show platform/type labels, skip session screening, and state that the request is manually confirmed and fulfilled through WeChat. |

## Public Catalog Policy Values

Public product cards and catalog copy must receive mutable service-policy values from
`getPublicSettings()` rather than embedding operational numbers in a shared component.
For example, pass `settings.policy.deliveryMinutes` into `ProductCard` and format it at
render time. This keeps homepage and catalog delivery claims aligned with the admin
settings used by the guide and fulfillment messaging.

```tsx
<ProductCard product={product} deliveryMinutes={settings.policy.deliveryMinutes} />
```

Do not add a literal such as `2 小时内交付` to a public card when the value is already
configurable in settings.

The admin create form must use labelled, keyboard-accessible selects for product type and platform. Account copy must not imply online payment, automatic delivery, or credential storage is available.

---

## Forbidden Patterns

<!-- Patterns that should never be used and why -->

(To be filled by the team)

---

## Required Patterns

<!-- Patterns that must always be used -->

(To be filled by the team)

---

## Testing Requirements

### Product WeChat contact widget

- The active public Next app is `apps/web`. Its local static assets must exist in
  `apps/web/public/`; root `public/` alone is not served by this app in development.
- `customerService.qrPath` remains settings-driven. For the default
  `/images/customer-service-wechat.jpg`, keep the web asset and the root asset
  (used by the Dockerfile) consistent.
- A product page HTTP 200 or an `<img>` in its HTML is not proof the QR works:
  request the image URL and verify browser `img.complete && img.naturalWidth > 0`.
- Verify contact expansion and collapse by clicking the visible control at desktop
  and mobile viewport sizes; the full QR must remain uncropped and within the viewport.

<!-- What level of testing is expected -->

(To be filled by the team)

---

## Code Review Checklist

<!-- What reviewers should check -->

(To be filled by the team)

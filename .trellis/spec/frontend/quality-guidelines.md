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

<!-- What level of testing is expected -->

(To be filled by the team)

---

## Code Review Checklist

<!-- What reviewers should check -->

(To be filled by the team)

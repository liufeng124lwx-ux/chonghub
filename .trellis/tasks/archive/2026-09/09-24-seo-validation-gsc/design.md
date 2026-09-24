# SEO production validation and GSC baseline — design

## Validation layers

1. Local app: endpoint and rendered HTML checks with the project launcher.
2. Origin/edge: public HTTPS and redirect checks, including Cloudflare and Caddy behavior.
3. Search console: URL Inspection, sitemap report, page-indexing reasons, and exports.

Each record includes timestamp, URL/property, user agent or GSC report, expected result, actual result, and follow-up action. Secrets, OAuth tokens, and raw account data are excluded.

## Data record

Use a dated Markdown or CSV record under the task research/output directory with:

- property and canonical host;
- date range and timezone;
- exported dimensions and metrics;
- source (GSC CSV, URL Inspection, curl, or browser);
- known latency and coverage limitations;
- decision/action generated from the observation.

No live GSC API integration is required. Static CSV upload is the supported fallback. If no data exists, record zero/empty as “not yet available,” not as evidence of no traffic.

## Review cadence

- First check: after deployment and sitemap submission.
- Two-week check: indexability and first matching queries.
- Four-week check: titles/CTR, pages with impressions but rank 8–30, and orphan/internal-link issues.
- Eight-week check: keep, revise, merge, or defer articles based on measured intent and business outcomes.

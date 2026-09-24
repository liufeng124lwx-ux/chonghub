# ChongHub SEO foundation — parent integration plan

The implementation is split into three independently verifiable children:

1. `09-24-seo-technical-foundation`: host normalization, robots/sitemap, metadata, structured data, and private-route controls.
2. `09-24-seo-content-cluster`: article loader/routes, five reviewed articles, trust copy, and internal links. It consumes the public URL/metadata contracts from Child 1.
3. `09-24-seo-validation-gsc`: production edge checks, GSC sitemap submission, URL Inspection, baseline exports, and review cadence after Children 1 and 2.

Order: Child 1 -> Child 2 -> Child 3. Each child must pass its own lint/typecheck/build or validation gate before the next child starts. The parent integration review checks the combined URL set, no orphan articles, canonical consistency, private-route exclusion, privacy boundary, and production evidence.

No task in this parent plan authorizes production deployment, GSC credential sharing, or external link purchasing. Deployment and GSC actions occur only after local gates pass and are recorded with reproducible evidence.

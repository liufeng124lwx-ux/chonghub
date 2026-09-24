# Production and GSC validation guidance

- A sitemap is a discovery hint, not an indexing guarantee: https://developers.google.com/search/help/crawling-index-faq
- Google URL Inspection and sitemap reports are the production evidence for crawl/index state; local build success is not production proof.
- Cloudflare may add managed content-signal comments to robots.txt; the edge response must be checked after deployment: https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/

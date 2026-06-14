# Performance Notes

## Current MVP

- List endpoints use DRF pagination with a default page size of 20.
- Common filters have database indexes, including `user_id`, `created_at`, `category`, `status`, and `professional_id` where relevant.
- Public catalog endpoints use `select_related` to avoid repeated category and provider queries.
- Portfolio summary is intentionally simple and only evaluates the authenticated user's mirrored items.

## Next Steps

- Add HTTP caching or application caching for published catalog categories and product passports.
- Add API rate limiting before public launch, especially for scam checks and simulations.
- Move heavy imports, provider catalog refreshes, and professional verification checks to Celery.
- Add query-count tests for catalog and portfolio summary endpoints once data volumes grow.
- Add monitoring for p95 response time, error rate, queue depth, and database slow queries.

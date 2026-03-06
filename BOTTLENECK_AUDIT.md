# Bottleneck Audit

## Scope
- Reviewed server actions, high-traffic pages, import pipelines, and Prisma schema for request-time, DB, and client-render performance issues.

## High-impact bottlenecks

1. **Row-by-row import writes (N+1 query pattern)**
   - `commitSpendeeImport` performs `findFirst` and `create`/`update` per row inside a loop, producing 1-3 DB queries for every imported row.
   - On large imports, this creates significant latency and high DB connection churn.
   - **Where:** `src/app/actions/import.ts`
   - **Why it hurts:** O(n) round-trips with expensive per-row duplicate checks instead of batched checks/inserts.
   - **Fix direction:** prefetch candidate duplicates in a date window, build a hash set in memory, then `createMany` in chunks; batch enrich-updates separately.

2. **Repeated full-array scans in analytics calculations**
   - `AnalyticsClient` repeatedly filters the full transaction array for each month and each chart.
   - This leads to repeated O(n) passes (bar + line + heatmap), which grows quickly with transaction volume.
   - **Where:** `src/components/analytics/AnalyticsClient.tsx`
   - **Why it hurts:** avoidable CPU work on client renders and tab/filter interactions.
   - **Fix direction:** preprocess once into month/category aggregates (single pass), then derive chart datasets from cached maps.

3. **Search endpoint likely forcing full/large scans**
   - `searchTransactions` uses `contains` on `description` and `category` with case-insensitive matching.
   - B-tree indexes are usually ineffective for `%query%` contains search; this can degrade as data grows.
   - **Where:** `src/app/actions/transactions.ts`
   - **Why it hurts:** linear-ish scan behavior under load for search-heavy usage.
   - **Fix direction:** PostgreSQL trigram indexes (`pg_trgm`) or full text search (`tsvector`) with ranked results.

4. **Heavy list fetches with broad limits in core pages**
   - Transactions and analytics pages fetch up to 500/1000 rows eagerly.
   - **Where:** `src/app/(app)/transactions/page.tsx`, `src/app/(app)/analytics/page.tsx`, `src/app/(app)/dashboard/page.tsx`
   - **Why it hurts:** larger payloads, slower TTFB, higher hydration/render cost.
   - **Fix direction:** pagination/infinite scroll for transactions, server-side pre-aggregation for analytics, and slimmer projection (`select`) for views that do not need full rows.

## Medium-impact bottlenecks

5. **Quadratic-ish wallet balance assembly in memory**
   - `getWallets` groups transactions in DB, but then for each wallet it filters all aggregations before summing.
   - **Where:** `src/app/actions/wallets.ts`
   - **Why it hurts:** O(wallets × aggregationRows) when a hashmap would make it near O(wallets + aggregationRows).
   - **Fix direction:** pre-index aggregations by walletId once, then compute each wallet balance in O(1) lookup.

6. **Over-fetching relational data where not always needed**
   - `getTransactions` always includes `wallet` relation even for consumers that only need transaction-level metrics.
   - **Where:** `src/app/actions/transactions.ts`
   - **Why it hurts:** larger query responses and serialization overhead.
   - **Fix direction:** add a `withWallet` option (default false in aggregation use-cases) or use context-specific `select` projections.

7. **Client-side filtering/grouping on already-large datasets**
   - `TransactionList` performs multiple client-side filters/grouping/sorting on potentially hundreds of transactions.
   - **Where:** `src/components/transactions/TransactionList.tsx`
   - **Why it hurts:** CPU on slower devices and jank during interactions.
   - **Fix direction:** move filtering/pagination server-side for large datasets; virtualize long lists.

## Schema/index observations

8. **Index coverage is good for date/category filters, but not for text contains search**
   - Current indexes help user/date/category lookups.
   - No specialized search index for `contains` queries in `searchTransactions`.
   - **Where:** `prisma/schema.prisma` and `src/app/actions/transactions.ts`
   - **Fix direction:** add trigram or FTS indexes if search is a key UX path.

## Prioritized remediation plan

1. **Import pipeline batching** (`commitSpendeeImport`) — biggest throughput win.
2. **Analytics pre-aggregation** (single-pass memoized compute).
3. **Search indexing strategy** (trigram/FTS).
4. **Pagination + projection trimming** for transactions/analytics/dashboard fetches.
5. **Wallet balance map optimization**.

## Quick measurable targets

- Import 10k rows: reduce DB round-trips by >90% using `createMany` chunking + duplicate prefetch.
- Analytics render: reduce computation passes from many per render to one preprocessing pass.
- Search P95 latency: target <150ms on moderate dataset with trigram index.
- Transactions page payload: cut initial rows from 500 to 50-100 with incremental loading.

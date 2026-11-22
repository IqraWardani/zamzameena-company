# Database migration folder

This folder is reserved for additive migration files generated for the ZAS Event schema.

Important constraints for this project:
- The SQL migration is the source of truth; Prisma schema changes must match it.
- Do not execute destructive commands such as drop, reset, truncate, or seed.
- Keep all local development credentials in `.env.local`, never in source control.
- The final source-of-truth schema remains in `docs/database/ZAS_EVENT_SCHEMA_V1.sql`.

Before applying `20261116_0003_standardize_invoice_numbers`, create and verify a full
database backup. The migration preserves every previous invoice number in
`invoices.legacy_invoice_number`, deterministically reassigns current invoice numbers
by registration date, and creates a PostgreSQL sequence for future invoices. It does
not update payment, registration, participant, or event data. The matching rollback
refuses to run if invoices have been created since the migration.

`20261120_0004_sales_management_referrals_commissions` is additive. It does not update
existing registration or invoice rows; historical invoice snapshot columns remain
`NULL` when the original unit price cannot be proven. New invoice writes are guarded
so all snapshot fields are present and immutable. The migration creates event-scoped
sales members, hierarchy constraints, referral attribution, and an append-only
commission ledger. Take and verify a database backup before applying it outside a
disposable local development database.

`20261120_0005_event_scoped_sales_referrals` is additive. It introduces global sales
identities and event memberships, stable event codes, an atomic referral-code
allocator, and a permanent referral-code registry. Existing member identities are
backfilled from their current event membership without changing registration,
invoice, payment, ticket, or commission rows. Only the known SPS event receives an
automatic event code; assign codes explicitly to other existing events before
creating new memberships. Take and verify a database backup before applying this
migration outside a disposable local development database.

`20261120_0006_sales_member_code_sequences` is additive. It creates non-cycling
PostgreSQL sequences for role-prefixed member codes, initializes them from matching
existing codes, and prevents issued global member codes from being changed. It adds
no tables and does not change `SalesMember` relations, referral codes, or existing
member identities. The existing unique index on `sales_persons.member_code` remains
the final duplicate guard. Take and verify a database backup before applying this
migration outside a disposable local development database.

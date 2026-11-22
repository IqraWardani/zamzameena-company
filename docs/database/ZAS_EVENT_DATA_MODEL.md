# ZAS Event — Database Design v1

This design is the implementation source of truth for the ZAS Event release. It is designed for PostgreSQL 18, the local database `zas_event_dev`, and application role `zas_app`. The base schema in [ZAS_EVENT_SCHEMA_V1.sql](./ZAS_EVENT_SCHEMA_V1.sql) is extended by [ZAS_EVENT_KEY_VISUALS_V2.sql](./ZAS_EVENT_KEY_VISUALS_V2.sql) and the versioned SQL migrations; the schema file is not executed automatically.

## Scope and boundaries

- Multi-event: one participant profile can register for different events, but only once per event.
- RBAC: roles and permissions are assigned to administrators. Event assignments restrict operational staff to specific events.
- Payment: a human administrator approves or rejects submitted payment claims. The system never marks a payment approved automatically.
- Invitation collection and check-in are distinct actions with separate tables and unique constraints.
- A public contact message does not create or update a participant profile.
- Private files are represented by private object-storage metadata only. Key Visual image bytes remain in the configured S3-compatible object storage; PostgreSQL stores its protected object key and first-party public image route, never binary data or provider credentials.

## Table inventory

| # | Table | Purpose |
|---:|---|---|
| 1 | `admin_users` | Administrative identities |
| 2 | `roles` | Role definitions |
| 3 | `permissions` | Permission definitions |
| 4 | `admin_user_roles` | Administrator-to-role assignment |
| 5 | `role_permissions` | Role-to-permission assignment |
| 6 | `events` | Event master data |
| 7 | `event_staff_assignments` | Per-event staff scope |
| 8 | `ticket_types` | Event registration categories and prices |
| 9 | `participant_profiles` | Central participant identity |
| 10 | `registrations` | One participant registration per event |
| 11 | `registration_answers` | Event-specific form responses |
| 12 | `invoices` | Registration billing records |
| 13 | `payments` | Manually reviewed payment claims |
| 14 | `private_documents` | Private storage metadata |
| 15 | `tickets` | Confirmed registration ticket |
| 16 | `invitation_codes` | Collection validation codes |
| 17 | `invitation_collections` | Invitation handover record |
| 18 | `check_ins` | Entrance record |
| 19 | `contact_submissions` | Public contact messages |
| 20 | `audit_logs` | Administrative activity evidence |
| 21 | `notification_deliveries` | Delivery queue and history |
| 22 | `participant_consents` | Policy consent evidence |
| 23 | `event_key_visuals` | Event image metadata and active/history state; binary data remains in object storage |
| 24 | `sales_persons` | Global sales-person identities shared across events |
| 25 | `sales_members` | Per-event sales membership, role, hierarchy, whole-ticket sales target, status, and immutable referral code |
| 26 | `sales_referral_sequences` | Concurrent-safe counter per event and position |
| 27 | `sales_referral_codes` | Registry of current and retired referral codes; codes are never reused |
| 28 | `sales_commissions` | Idempotent earned commissions and append-only future adjustments |

## Required application invariants

Some rules require a transaction in the Next.js server layer because they span rows or tables:

1. A `registrations.ticket_type_id` must belong to the same event as `registrations.event_id`.
2. A registration may use only an active ticket type, within its sale window and capacity.
3. There may be at most one open invoice for a registration. Use a transaction and a partial unique index if invoice lifecycle is finalized.
4. A payment becomes `approved` or `rejected` only through a permitted admin action; update its invoice and registration state in the same transaction.
5. A ticket is issued once, only after an approved payment, or immediately for a zero-price ticket according to the agreed workflow.
6. `invitation_codes`, `invitation_collections`, and `check_ins` must all match the registration's event.
7. Invitation collection requires an eligible confirmed registration; check-in requires an active ticket and confirmed registration.
8. Every status-changing staff action writes an `audit_logs` entry in the same transaction.
9. Access to a private document requires ownership or an authorized staff role/event assignment, then returns a short-lived signed URL.
10. At most one non-deleted Key Visual per event is active. The database enforces this with a partial unique index; replacements retain previous metadata and object files.
11. Invoice price fields are immutable snapshots. New invoices require unit price, quantity, subtotal, discount, and amount due; unknown legacy snapshots remain `NULL` and historical transaction amounts are not backfilled.
12. A `sales_persons` identity is global; `sales_members` holds its event-specific role, hierarchy, status, and nonnegative whole-ticket sales target. `quota_amount` remains numeric for compatibility, but the application treats it as ticket count and compares progress with paid ticket quantities, not payment value. A person may have at most one membership per event.
13. Every event has an explicit, stable event code. Referral codes use `[POSITION]-[EVENT]-[SEQUENCE]`, with an atomic database counter per event and position. Referral codes remain registered after membership deletion and cannot be changed or reused.
14. Sales member supervisor links must remain within the same event and follow Direktur Pemasaran → ARM → Kepala Cabang → Sales. The database serializes active-member capacity checks and enforces the configured hierarchy limits.
15. Registration referral attribution snapshots the membership ID and event-specific referral code. Only active memberships for that event can receive new referrals; a database trigger permits later correction only in an explicitly marked transaction, and the admin correction action writes an audit entry.
16. A commission is earned only during a successful admin payment-approval transaction, for the directly attributed seller and only when a normal-price subtotal exists and amount due is nonzero. A unique partial index permits one earned ledger entry per registration; adjustments are separate records and do not erase earned history.
17. `sales.read` and `sales.manage` are separate permissions. The `marketing_director` dashboard role is read-only, while a sales-member record with position `director` may receive direct referral attribution. Server-side authorization explicitly denies management actions to the dashboard role.

## State transitions

| Resource | Permitted path |
|---|---|
| Registration | `pending_payment` → `payment_submitted` → `confirmed`; rejected payment uses `payment_rejected`; cancellation/expiry are terminal unless an explicit recovery workflow is added. |
| Invoice | `pending` → `payment_submitted` → `paid` or `rejected`; `void` and `expired` are terminal. |
| Payment | `submitted` → `approved` or `rejected`; no automatic approval. |
| Ticket | `active` → `void` or `cancelled`. |
| Collection | One record only per registration. |
| Check-in | One record only per registration. |

## Security decisions

- Store admin passwords only as modern adaptive hashes; never in SQL seed files or environment examples.
- Keep `DATABASE_URL`, storage credentials, email credentials, and signing keys only in local/host environment variables.
- Do not expose `private_documents.object_key` to untrusted clients.
- Enforce permissions and event scope in server-side route handlers/server actions, not only in the UI.
- Public seller lookup is event-scoped, requires a two-character prefix, returns at most eight active memberships, and excludes contact details.
- Validate all user input with a server-side schema; parameterize all database access through the selected data layer.
- Audit metadata must exclude secrets, passwords, session tokens, payment document bytes, and full sensitive personal data where not required.

## Deliberate non-features in v1

- No public admin link.
- No automatic payment gateway or automatic payment verification.
- No public participant directory.
- No public document URLs.
- No destructive reset, drop, or truncate operation in the migration.
- No sales-member login accounts, refund workflow, or commission-payout processing; the ledger only provides a safe place for future adjustment entries.

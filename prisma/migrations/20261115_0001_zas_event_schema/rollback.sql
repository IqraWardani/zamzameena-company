-- Rollback script for explicit reversal only.
-- This script is intentionally destructive and should only be used after a deliberate rollback decision.
-- It is not part of the additive migration workflow.

BEGIN;

DROP INDEX IF EXISTS participant_consents_profile_idx;
DROP INDEX IF EXISTS notification_deliveries_status_created_idx;
DROP INDEX IF EXISTS audit_logs_entity_idx;
DROP INDEX IF EXISTS audit_logs_event_created_idx;
DROP INDEX IF EXISTS contact_submissions_status_created_idx;
DROP INDEX IF EXISTS check_ins_event_checked_idx;
DROP INDEX IF EXISTS invitation_collections_event_collected_idx;
DROP INDEX IF EXISTS invitation_codes_lookup_idx;
DROP INDEX IF EXISTS private_documents_owner_idx;
DROP INDEX IF EXISTS payments_invoice_status_idx;
DROP INDEX IF EXISTS invoices_registration_status_idx;
DROP INDEX IF EXISTS registrations_participant_idx;
DROP INDEX IF EXISTS registrations_event_status_idx;
DROP INDEX IF EXISTS participant_profiles_email_idx;
DROP INDEX IF EXISTS ticket_types_event_active_idx;
DROP INDEX IF EXISTS event_staff_assignments_admin_idx;
DROP INDEX IF EXISTS events_status_starts_at_idx;

DROP TABLE IF EXISTS participant_consents;
DROP TABLE IF EXISTS notification_deliveries;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS contact_submissions;
DROP TABLE IF EXISTS check_ins;
DROP TABLE IF EXISTS invitation_collections;
DROP TABLE IF EXISTS invitation_codes;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS private_documents;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS registration_answers;
DROP TABLE IF EXISTS registrations;
DROP TABLE IF EXISTS participant_profiles;
DROP TABLE IF EXISTS ticket_types;
DROP TABLE IF EXISTS event_staff_assignments;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS admin_user_roles;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS admin_users;

DROP TYPE IF EXISTS notification_status;
DROP TYPE IF EXISTS contact_status;
DROP TYPE IF EXISTS document_kind;
DROP TYPE IF EXISTS document_owner_type;
DROP TYPE IF EXISTS invitation_collection_method;
DROP TYPE IF EXISTS ticket_status;
DROP TYPE IF EXISTS payment_status;
DROP TYPE IF EXISTS invoice_status;
DROP TYPE IF EXISTS registration_status;
DROP TYPE IF EXISTS event_status;
DROP TYPE IF EXISTS admin_account_status;

COMMIT;

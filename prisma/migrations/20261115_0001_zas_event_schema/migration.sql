-- ZAS Event v1 schema migration
-- Source of truth: docs/database/ZAS_EVENT_SCHEMA_V1.sql
-- This migration is additive and safe for an empty development database.
-- It intentionally does not seed admin accounts or runtime credentials.

BEGIN;

CREATE TYPE admin_account_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE event_status AS ENUM ('draft', 'published', 'closed', 'cancelled', 'archived');
CREATE TYPE registration_status AS ENUM ('pending_payment', 'payment_submitted', 'payment_rejected', 'confirmed', 'cancelled', 'expired');
CREATE TYPE invoice_status AS ENUM ('pending', 'payment_submitted', 'paid', 'rejected', 'void', 'expired');
CREATE TYPE payment_status AS ENUM ('submitted', 'approved', 'rejected');
CREATE TYPE ticket_status AS ENUM ('active', 'void', 'cancelled');
CREATE TYPE invitation_collection_method AS ENUM ('invitation_code', 'participant_search');
CREATE TYPE document_owner_type AS ENUM ('payment', 'participant', 'registration');
CREATE TYPE document_kind AS ENUM ('payment_proof', 'identity_document', 'other');
CREATE TYPE contact_status AS ENUM ('new', 'in_progress', 'resolved', 'spam');
CREATE TYPE notification_status AS ENUM ('queued', 'sent', 'failed');

CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(320) NOT NULL,
  full_name varchar(160) NOT NULL,
  password_hash text NOT NULL,
  status admin_account_status NOT NULL DEFAULT 'active',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_users_email_unique UNIQUE (email),
  CONSTRAINT admin_users_email_lowercase CHECK (email = lower(email))
);

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL,
  name varchar(120) NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roles_code_unique UNIQUE (code)
);

CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(120) NOT NULL,
  name varchar(160) NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT permissions_code_unique UNIQUE (code)
);

CREATE TABLE admin_user_roles (
  admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_by_admin_user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (admin_user_id, role_id)
);

CREATE TABLE role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE RESTRICT,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(160) NOT NULL,
  name varchar(200) NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  timezone varchar(64) NOT NULL DEFAULT 'Asia/Makassar',
  venue_name varchar(200),
  venue_address text,
  status event_status NOT NULL DEFAULT 'draft',
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  created_by_admin_user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_slug_unique UNIQUE (slug),
  CONSTRAINT events_time_range CHECK (ends_at > starts_at),
  CONSTRAINT events_registration_range CHECK (registration_closes_at IS NULL OR registration_opens_at IS NULL OR registration_closes_at > registration_opens_at)
);

CREATE TABLE event_staff_assignments (
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  assigned_by_admin_user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, admin_user_id)
);

CREATE TABLE ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  code varchar(80) NOT NULL,
  name varchar(160) NOT NULL,
  description text,
  price_amount numeric(14,2) NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'IDR',
  capacity integer,
  sales_opens_at timestamptz,
  sales_closes_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticket_types_event_code_unique UNIQUE (event_id, code),
  CONSTRAINT ticket_types_nonnegative_price CHECK (price_amount >= 0),
  CONSTRAINT ticket_types_positive_capacity CHECK (capacity IS NULL OR capacity > 0),
  CONSTRAINT ticket_types_sales_range CHECK (sales_closes_at IS NULL OR sales_opens_at IS NULL OR sales_closes_at > sales_opens_at)
);

CREATE TABLE participant_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(160) NOT NULL,
  email varchar(320) NOT NULL,
  phone varchar(40) NOT NULL,
  organization_name varchar(200),
  job_title varchar(160),
  city varchar(120),
  country_code char(2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT participant_profiles_email_lowercase CHECK (email = lower(email))
);

CREATE TABLE registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number varchar(40) NOT NULL,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  participant_profile_id uuid NOT NULL REFERENCES participant_profiles(id) ON DELETE RESTRICT,
  ticket_type_id uuid NOT NULL REFERENCES ticket_types(id) ON DELETE RESTRICT,
  status registration_status NOT NULL DEFAULT 'pending_payment',
  registered_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT registrations_number_unique UNIQUE (registration_number),
  CONSTRAINT registrations_participant_event_unique UNIQUE (event_id, participant_profile_id)
);

CREATE TABLE registration_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
  field_key varchar(100) NOT NULL,
  answer jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT registration_answers_field_unique UNIQUE (registration_id, field_key)
);

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number varchar(40) NOT NULL,
  registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
  currency char(3) NOT NULL DEFAULT 'IDR',
  amount_due numeric(14,2) NOT NULL,
  status invoice_status NOT NULL DEFAULT 'pending',
  due_at timestamptz,
  issued_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoices_number_unique UNIQUE (invoice_number),
  CONSTRAINT invoices_nonnegative_due CHECK (amount_due >= 0)
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  amount_paid numeric(14,2) NOT NULL,
  paid_at timestamptz,
  sender_name varchar(160),
  sender_bank varchar(120),
  reference_number varchar(120),
  status payment_status NOT NULL DEFAULT 'submitted',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by_admin_user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_positive_amount CHECK (amount_paid > 0),
  CONSTRAINT payments_review_consistency CHECK ((status = 'submitted' AND reviewed_at IS NULL) OR (status IN ('approved', 'rejected') AND reviewed_at IS NOT NULL))
);

CREATE TABLE private_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type document_owner_type NOT NULL,
  owner_id uuid NOT NULL,
  kind document_kind NOT NULL,
  storage_provider varchar(50) NOT NULL,
  object_key text NOT NULL,
  original_filename varchar(255) NOT NULL,
  content_type varchar(127) NOT NULL,
  byte_size bigint NOT NULL,
  checksum_sha256 char(64),
  uploaded_by_admin_user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT private_documents_object_unique UNIQUE (storage_provider, object_key),
  CONSTRAINT private_documents_positive_size CHECK (byte_size > 0)
);

CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code varchar(80) NOT NULL,
  registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
  status ticket_status NOT NULL DEFAULT 'active',
  issued_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tickets_code_unique UNIQUE (ticket_code),
  CONSTRAINT tickets_registration_unique UNIQUE (registration_id)
);

CREATE TABLE invitation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  code varchar(80) NOT NULL,
  registration_id uuid REFERENCES registrations(id) ON DELETE RESTRICT,
  ticket_id uuid REFERENCES tickets(id) ON DELETE RESTRICT,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invitation_codes_event_code_unique UNIQUE (event_id, code),
  CONSTRAINT invitation_codes_target_check CHECK (registration_id IS NOT NULL OR ticket_id IS NOT NULL)
);

CREATE TABLE invitation_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
  invitation_code_id uuid REFERENCES invitation_codes(id) ON DELETE RESTRICT,
  method invitation_collection_method NOT NULL,
  collected_by_admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  collected_at timestamptz NOT NULL DEFAULT now(),
  note text,
  CONSTRAINT invitation_collections_registration_unique UNIQUE (registration_id),
  CONSTRAINT invitation_collections_method_code_check CHECK ((method = 'invitation_code' AND invitation_code_id IS NOT NULL) OR (method = 'participant_search' AND invitation_code_id IS NULL))
);

CREATE TABLE check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
  ticket_id uuid REFERENCES tickets(id) ON DELETE RESTRICT,
  checked_in_by_admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  note text,
  CONSTRAINT check_ins_registration_unique UNIQUE (registration_id)
);

CREATE TABLE contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(160) NOT NULL,
  email varchar(320) NOT NULL,
  phone varchar(40),
  subject varchar(200),
  message text NOT NULL,
  status contact_status NOT NULL DEFAULT 'new',
  assigned_to_admin_user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  source_path varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contact_submissions_email_lowercase CHECK (email = lower(email))
);

CREATE TABLE audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_admin_user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,
  action varchar(120) NOT NULL,
  entity_type varchar(80) NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid REFERENCES registrations(id) ON DELETE SET NULL,
  participant_profile_id uuid REFERENCES participant_profiles(id) ON DELETE SET NULL,
  channel varchar(30) NOT NULL,
  template_key varchar(100) NOT NULL,
  recipient varchar(320) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status notification_status NOT NULL DEFAULT 'queued',
  provider_message_id varchar(255),
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_deliveries_recipient_check CHECK (length(trim(recipient)) > 0),
  CONSTRAINT notification_deliveries_attempts_check CHECK (attempts >= 0)
);

CREATE TABLE participant_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_profile_id uuid NOT NULL REFERENCES participant_profiles(id) ON DELETE RESTRICT,
  consent_type varchar(100) NOT NULL,
  policy_version varchar(80) NOT NULL,
  granted boolean NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  source varchar(80),
  CONSTRAINT participant_consents_version_unique UNIQUE (participant_profile_id, consent_type, policy_version)
);

CREATE INDEX events_status_starts_at_idx ON events (status, starts_at);
CREATE INDEX event_staff_assignments_admin_idx ON event_staff_assignments (admin_user_id, event_id);
CREATE INDEX ticket_types_event_active_idx ON ticket_types (event_id, is_active);
CREATE INDEX participant_profiles_email_idx ON participant_profiles (email);
CREATE INDEX registrations_event_status_idx ON registrations (event_id, status);
CREATE INDEX registrations_participant_idx ON registrations (participant_profile_id);
CREATE INDEX invoices_registration_status_idx ON invoices (registration_id, status);
CREATE INDEX payments_invoice_status_idx ON payments (invoice_id, status);
CREATE INDEX private_documents_owner_idx ON private_documents (owner_type, owner_id) WHERE deleted_at IS NULL;
CREATE INDEX invitation_codes_lookup_idx ON invitation_codes (event_id, code) WHERE is_active = true;
CREATE INDEX invitation_collections_event_collected_idx ON invitation_collections (event_id, collected_at);
CREATE INDEX check_ins_event_checked_idx ON check_ins (event_id, checked_in_at);
CREATE INDEX contact_submissions_status_created_idx ON contact_submissions (status, created_at DESC);
CREATE INDEX audit_logs_event_created_idx ON audit_logs (event_id, created_at DESC);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX notification_deliveries_status_created_idx ON notification_deliveries (status, created_at);
CREATE INDEX participant_consents_profile_idx ON participant_consents (participant_profile_id, consent_type);

COMMIT;

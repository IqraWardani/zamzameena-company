-- Read-only schema assertions for the ZAS Event v1 migration.

DO $$
DECLARE
  app_table_count integer;
  enum_count integer;
  required_enum_count integer;
  enum_definition record;
  actual_enum_labels text[];
  foreign_key_count integer;
  required_count integer;
BEGIN
  SELECT count(*) INTO app_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  IF app_table_count <> 22 THEN
    RAISE EXCEPTION 'Expected 22 application tables, found %', app_table_count;
  END IF;

  SELECT count(*) INTO enum_count
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public' AND t.typtype = 'e';
  IF enum_count <> 11 THEN
    RAISE EXCEPTION 'Expected 11 application enums, found %', enum_count;
  END IF;

  SELECT count(*) INTO required_enum_count
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public' AND t.typtype = 'e'
    AND t.typname IN (
      'admin_account_status', 'event_status', 'registration_status',
      'invoice_status', 'payment_status', 'ticket_status',
      'invitation_collection_method', 'document_owner_type', 'document_kind',
      'contact_status', 'notification_status'
    );
  IF required_enum_count <> 11 THEN
    RAISE EXCEPTION 'One or more required application enums are missing';
  END IF;

  FOR enum_definition IN
    SELECT * FROM (VALUES
      ('admin_account_status', ARRAY['active', 'inactive', 'suspended']::text[]),
      ('event_status', ARRAY['draft', 'published', 'closed', 'cancelled', 'archived']::text[]),
      ('registration_status', ARRAY['pending_payment', 'payment_submitted', 'payment_rejected', 'confirmed', 'cancelled', 'expired']::text[]),
      ('invoice_status', ARRAY['pending', 'payment_submitted', 'paid', 'rejected', 'void', 'expired']::text[]),
      ('payment_status', ARRAY['submitted', 'approved', 'rejected']::text[]),
      ('ticket_status', ARRAY['active', 'void', 'cancelled']::text[]),
      ('invitation_collection_method', ARRAY['invitation_code', 'participant_search']::text[]),
      ('document_owner_type', ARRAY['payment', 'participant', 'registration']::text[]),
      ('document_kind', ARRAY['payment_proof', 'identity_document', 'other']::text[]),
      ('contact_status', ARRAY['new', 'in_progress', 'resolved', 'spam']::text[]),
      ('notification_status', ARRAY['queued', 'sent', 'failed']::text[])
    ) AS expected(type_name, labels)
  LOOP
    SELECT array_agg(e.enumlabel::text ORDER BY e.enumsortorder)
    INTO actual_enum_labels
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE n.nspname = 'public' AND t.typname = enum_definition.type_name;
    IF actual_enum_labels IS DISTINCT FROM enum_definition.labels THEN
      RAISE EXCEPTION 'Enum % has unexpected labels', enum_definition.type_name;
    END IF;
  END LOOP;

  SELECT count(*) INTO foreign_key_count
  FROM pg_constraint c
  JOIN pg_namespace n ON n.oid = c.connamespace
  WHERE n.nspname = 'public' AND c.contype = 'f';
  IF foreign_key_count <> 36 THEN
    RAISE EXCEPTION 'Expected 36 foreign keys, found %', foreign_key_count;
  END IF;

  SELECT count(*) INTO required_count
  FROM pg_constraint c
  JOIN pg_class r ON r.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = r.relnamespace
  WHERE n.nspname = 'public' AND c.contype = 'u'
    AND c.conname IN (
      'registrations_participant_event_unique',
      'tickets_registration_unique',
      'invitation_collections_registration_unique',
      'check_ins_registration_unique'
    );
  IF required_count <> 4 THEN
    RAISE EXCEPTION 'One or more required per-registration unique constraints are missing';
  END IF;

  SELECT count(*) INTO required_count
  FROM pg_constraint c
  JOIN pg_class r ON r.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = r.relnamespace
  WHERE n.nspname = 'public' AND c.contype = 'c'
    AND c.conname IN (
      'admin_users_email_lowercase',
      'events_time_range',
      'events_registration_range',
      'ticket_types_nonnegative_price',
      'ticket_types_positive_capacity',
      'ticket_types_sales_range',
      'participant_profiles_email_lowercase',
      'invoices_nonnegative_due',
      'payments_positive_amount',
      'payments_review_consistency',
      'private_documents_positive_size',
      'invitation_codes_target_check',
      'invitation_collections_method_code_check',
      'contact_submissions_email_lowercase',
      'notification_deliveries_recipient_check',
      'notification_deliveries_attempts_check'
    );
  IF required_count <> 16 THEN
    RAISE EXCEPTION 'One or more required check constraints are missing';
  END IF;

  SELECT count(*) INTO required_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'events_status_starts_at_idx',
      'event_staff_assignments_admin_idx',
      'ticket_types_event_active_idx',
      'participant_profiles_email_idx',
      'registrations_event_status_idx',
      'registrations_participant_idx',
      'invoices_registration_status_idx',
      'payments_invoice_status_idx',
      'private_documents_owner_idx',
      'invitation_codes_lookup_idx',
      'invitation_collections_event_collected_idx',
      'check_ins_event_checked_idx',
      'contact_submissions_status_created_idx',
      'audit_logs_event_created_idx',
      'audit_logs_entity_idx',
      'notification_deliveries_status_created_idx',
      'participant_consents_profile_idx'
    );
  IF required_count <> 17 THEN
    RAISE EXCEPTION 'One or more required indexes are missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'contact_submissions'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'participant_profiles'
  ) OR EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contact_submissions'
      AND column_name = 'participant_profile_id'
  ) THEN
    RAISE EXCEPTION 'Contact submissions are not separate from participant profiles';
  END IF;

  SELECT count(*) INTO required_count
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'private_documents'
    AND column_name IN (
      'owner_type', 'owner_id', 'kind', 'storage_provider', 'object_key',
      'original_filename', 'content_type', 'byte_size'
    );
  IF required_count <> 8 THEN
    RAISE EXCEPTION 'Private document metadata columns are incomplete';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'private_documents'
      AND column_name IN ('file_data', 'file_bytes', 'public_url', 'url')
  ) THEN
    RAISE EXCEPTION 'Private documents contain file bytes or a public URL column';
  END IF;
END
$$;

SELECT
  (SELECT count(*) FROM information_schema.tables
   WHERE table_schema = 'public' AND table_type = 'BASE TABLE') AS application_tables,
  (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
   WHERE n.nspname = 'public' AND t.typtype = 'e') AS enums,
  (SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
   WHERE n.nspname = 'public' AND c.contype = 'f') AS foreign_keys,
  (SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
   WHERE n.nspname = 'public' AND c.contype = 'c') AS check_constraints,
  (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public'
   AND indexname LIKE '%\_idx' ESCAPE '\') AS named_indexes;

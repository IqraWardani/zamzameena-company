-- Additive Key Visual Management schema extension.
-- Apply only after ZAS_EVENT_SCHEMA_V1.sql. This file is not executed automatically.
-- Image bytes stay in the configured S3-compatible object storage.

BEGIN;

CREATE TABLE event_key_visuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  uploaded_by_admin_user_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  original_filename varchar(255) NOT NULL,
  content_type varchar(127) NOT NULL,
  byte_size bigint NOT NULL,
  object_key text NOT NULL,
  url varchar(500) NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT event_key_visuals_object_key_unique UNIQUE (object_key),
  CONSTRAINT event_key_visuals_content_type_check
    CHECK (content_type IN ('image/png', 'image/jpeg', 'image/webp')),
  CONSTRAINT event_key_visuals_byte_size_check
    CHECK (byte_size BETWEEN 1 AND 8388608),
  CONSTRAINT event_key_visuals_deleted_inactive_check
    CHECK (deleted_at IS NULL OR is_active = false)
);

CREATE INDEX event_key_visuals_event_created_idx
  ON event_key_visuals (event_id, created_at);

CREATE UNIQUE INDEX event_key_visuals_one_active_per_event_unique
  ON event_key_visuals (event_id)
  WHERE is_active = true AND deleted_at IS NULL;

COMMIT;

ALTER TYPE sales_member_position ADD VALUE IF NOT EXISTS 'director';

BEGIN;

ALTER TABLE public.events
  ADD COLUMN event_code varchar(12);

UPDATE public.events
SET event_code = 'SPS'
WHERE slug = 'synergy-preneur-summit-2027';

ALTER TABLE public.events
  ADD CONSTRAINT events_event_code_format
  CHECK (event_code IS NULL OR event_code ~ '^[A-Z0-9]{2,12}$');

CREATE UNIQUE INDEX events_event_code_unique
  ON public.events (lower(event_code))
  WHERE event_code IS NOT NULL;

CREATE TABLE public.sales_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(160) NOT NULL,
  member_code varchar(40) NOT NULL,
  phone varchar(40) NOT NULL,
  email varchar(320),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_persons_full_name_nonempty CHECK (btrim(full_name) <> ''),
  CONSTRAINT sales_persons_member_code_nonempty CHECK (btrim(member_code) <> ''),
  CONSTRAINT sales_persons_phone_nonempty CHECK (btrim(phone) <> '')
);

CREATE UNIQUE INDEX sales_persons_member_code_unique
  ON public.sales_persons (lower(member_code));

ALTER TABLE public.sales_members
  ADD COLUMN person_id uuid;

INSERT INTO public.sales_persons (id, full_name, member_code, phone, email, created_at, updated_at)
SELECT id, full_name, member_code, phone, email, created_at, updated_at
FROM public.sales_members;

UPDATE public.sales_members
SET person_id = id;

ALTER TABLE public.sales_members
  ALTER COLUMN person_id SET NOT NULL,
  ADD CONSTRAINT sales_members_person_fk
    FOREIGN KEY (person_id) REFERENCES public.sales_persons(id) ON DELETE RESTRICT,
  ADD CONSTRAINT sales_members_person_event_unique UNIQUE (person_id, event_id);

DROP INDEX public.sales_members_member_code_unique;
DROP INDEX public.sales_members_referral_code_unique;

CREATE UNIQUE INDEX sales_members_event_member_code_unique
  ON public.sales_members (event_id, lower(member_code));
CREATE UNIQUE INDEX sales_members_event_referral_code_unique
  ON public.sales_members (event_id, lower(referral_code));
CREATE UNIQUE INDEX sales_members_one_active_director_per_event
  ON public.sales_members (event_id)
  WHERE position = 'director' AND status = 'active';

CREATE TABLE public.sales_referral_sequences (
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  position sales_member_position NOT NULL,
  last_value integer NOT NULL DEFAULT 0,
  PRIMARY KEY (event_id, position),
  CONSTRAINT sales_referral_sequences_nonnegative CHECK (last_value >= 0)
);

CREATE TABLE public.sales_referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  sales_member_id uuid REFERENCES public.sales_members(id) ON DELETE SET NULL,
  position sales_member_position NOT NULL,
  sequence_number integer,
  referral_code varchar(40) NOT NULL,
  allocated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_referral_codes_sequence_positive
    CHECK (sequence_number IS NULL OR sequence_number > 0)
);

CREATE UNIQUE INDEX sales_referral_codes_code_unique
  ON public.sales_referral_codes (lower(referral_code));
CREATE UNIQUE INDEX sales_referral_codes_member_unique
  ON public.sales_referral_codes (sales_member_id)
  WHERE sales_member_id IS NOT NULL;
CREATE UNIQUE INDEX sales_referral_codes_sequence_unique
  ON public.sales_referral_codes (event_id, position, sequence_number)
  WHERE sequence_number IS NOT NULL;

INSERT INTO public.sales_referral_codes (
  event_id, sales_member_id, position, sequence_number, referral_code
)
SELECT
  member.event_id,
  member.id,
  member.position,
  CASE
    WHEN event.event_code IS NOT NULL
      AND member.referral_code ~ (
        '^' ||
        CASE member.position
          WHEN 'director' THEN 'DIR'
          WHEN 'arm' THEN 'ARM'
          WHEN 'branch_manager' THEN 'KCB'
          WHEN 'sales' THEN 'SLS'
        END ||
        '-' || event.event_code || '-[0-9]{3,}$'
      )
    THEN substring(member.referral_code FROM '([0-9]{3,})$')::integer
    ELSE NULL
  END,
  member.referral_code
FROM public.sales_members AS member
INNER JOIN public.events AS event ON event.id = member.event_id;

INSERT INTO public.sales_referral_sequences (event_id, position, last_value)
SELECT event_id, position, max(sequence_number)
FROM public.sales_referral_codes
WHERE sequence_number IS NOT NULL
GROUP BY event_id, position
ON CONFLICT (event_id, position)
DO UPDATE SET last_value = GREATEST(
  public.sales_referral_sequences.last_value,
  EXCLUDED.last_value
);

CREATE FUNCTION public.allocate_sales_referral_code(
  p_event_id uuid,
  p_position sales_member_position
)
RETURNS varchar(40)
LANGUAGE plpgsql
AS $$
DECLARE
  event_code_value varchar(12);
  prefix_value varchar(3);
  sequence_value integer;
  referral_code_value varchar(40);
  inserted_rows integer;
BEGIN
  SELECT event_code INTO event_code_value
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF event_code_value IS NULL THEN
    RAISE EXCEPTION 'Set a stable event code before adding sales members.';
  END IF;

  prefix_value := CASE p_position
    WHEN 'director' THEN 'DIR'
    WHEN 'arm' THEN 'ARM'
    WHEN 'branch_manager' THEN 'KCB'
    WHEN 'sales' THEN 'SLS'
  END;

  IF prefix_value IS NULL THEN
    RAISE EXCEPTION 'Unsupported sales member position.';
  END IF;

  LOOP
    INSERT INTO public.sales_referral_sequences (event_id, position, last_value)
    VALUES (p_event_id, p_position, 1)
    ON CONFLICT (event_id, position)
    DO UPDATE SET last_value = public.sales_referral_sequences.last_value + 1
    RETURNING last_value INTO sequence_value;

    referral_code_value := prefix_value || '-' || event_code_value || '-' ||
      lpad(sequence_value::text, 3, '0');

    INSERT INTO public.sales_referral_codes (
      event_id, position, sequence_number, referral_code
    ) VALUES (
      p_event_id, p_position, sequence_value, referral_code_value
    ) ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS inserted_rows = ROW_COUNT;
    EXIT WHEN inserted_rows = 1;
  END LOOP;

  RETURN referral_code_value;
END;
$$;

CREATE FUNCTION public.protect_sales_referral_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
    RAISE EXCEPTION 'Sales referral codes are immutable.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sales_members_referral_code_guard
  BEFORE UPDATE OF referral_code ON public.sales_members
  FOR EACH ROW EXECUTE FUNCTION public.protect_sales_referral_code();

CREATE FUNCTION public.protect_event_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.event_code IS NOT NULL AND NEW.event_code IS DISTINCT FROM OLD.event_code THEN
    RAISE EXCEPTION 'An event code cannot change after a sales referral has been allocated.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER events_code_immutability_guard
  BEFORE UPDATE OF event_code ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.protect_event_code();

CREATE OR REPLACE FUNCTION public.enforce_sales_member_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_position sales_member_position;
  parent_status sales_member_status;
  active_count integer;
  required_parent_position sales_member_position;
  max_reports integer;
BEGIN
  PERFORM 1 FROM public.events WHERE id = NEW.event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales member event does not exist.';
  END IF;

  IF NEW.position = 'director' THEN
    IF NEW.supervisor_member_id IS NOT NULL THEN
      RAISE EXCEPTION 'A Marketing Director cannot have a sales-member supervisor.';
    END IF;
    SELECT count(*) INTO active_count
      FROM public.sales_members
      WHERE event_id = NEW.event_id
        AND position = 'director'
        AND status = 'active'
        AND (TG_OP = 'INSERT' OR id <> NEW.id);
    IF NEW.status = 'active' AND active_count >= 1 THEN
      RAISE EXCEPTION 'An event can have only one active Marketing Director.';
    END IF;
  ELSIF NEW.position = 'arm' THEN
    IF NEW.supervisor_member_id IS NULL THEN
      IF TG_OP = 'INSERT' THEN
        RAISE EXCEPTION 'A new ARM must report to the event Marketing Director.';
      END IF;
    ELSE
      SELECT position, status INTO parent_position, parent_status
        FROM public.sales_members
        WHERE id = NEW.supervisor_member_id AND event_id = NEW.event_id;
      IF parent_position IS DISTINCT FROM 'director'::sales_member_position THEN
        RAISE EXCEPTION 'An ARM must report to the event Marketing Director.';
      END IF;
      IF NEW.status = 'active' AND parent_status <> 'active' THEN
        RAISE EXCEPTION 'An active ARM requires an active Marketing Director.';
      END IF;
    END IF;

    SELECT count(*) INTO active_count
      FROM public.sales_members
      WHERE event_id = NEW.event_id
        AND position = 'arm'
        AND status = 'active'
        AND (TG_OP = 'INSERT' OR id <> NEW.id);
    IF NEW.status = 'active' AND active_count >= 5 THEN
      RAISE EXCEPTION 'An event can have at most five active ARMs.';
    END IF;
  ELSE
    IF NEW.supervisor_member_id IS NULL THEN
      RAISE EXCEPTION 'A sales member must have a direct supervisor.';
    END IF;
    SELECT position, status INTO parent_position, parent_status
      FROM public.sales_members
      WHERE id = NEW.supervisor_member_id AND event_id = NEW.event_id;
    required_parent_position := CASE NEW.position
      WHEN 'branch_manager' THEN 'arm'::sales_member_position
      WHEN 'sales' THEN 'branch_manager'::sales_member_position
      ELSE NULL
    END;
    IF parent_position IS DISTINCT FROM required_parent_position THEN
      RAISE EXCEPTION 'The selected supervisor has an invalid position.';
    END IF;
    IF NEW.status = 'active' AND parent_status <> 'active' THEN
      RAISE EXCEPTION 'An active sales member requires an active supervisor.';
    END IF;

    max_reports := CASE NEW.position WHEN 'branch_manager' THEN 5 ELSE 2 END;
    SELECT count(*) INTO active_count
      FROM public.sales_members
      WHERE supervisor_member_id = NEW.supervisor_member_id
        AND status = 'active'
        AND (TG_OP = 'INSERT' OR id <> NEW.id);
    IF NEW.status = 'active' AND active_count >= max_reports THEN
      RAISE EXCEPTION 'The selected supervisor has reached the position limit.';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.position <> OLD.position AND EXISTS (
    SELECT 1 FROM public.sales_members WHERE supervisor_member_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Reassign or deactivate direct reports before changing this position.';
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;

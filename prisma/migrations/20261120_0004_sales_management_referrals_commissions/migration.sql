BEGIN;

CREATE TYPE sales_member_position AS ENUM ('arm', 'branch_manager', 'sales');
CREATE TYPE sales_member_status AS ENUM ('active', 'inactive');
CREATE TYPE sales_commission_entry_type AS ENUM ('earned', 'adjustment');

ALTER TABLE public.invoices
  ADD COLUMN unit_price_amount numeric(14, 2),
  ADD COLUMN quantity integer,
  ADD COLUMN subtotal_amount numeric(14, 2),
  ADD COLUMN discount_amount numeric(14, 2),
  ADD CONSTRAINT invoices_unit_price_nonnegative
    CHECK (unit_price_amount IS NULL OR unit_price_amount >= 0),
  ADD CONSTRAINT invoices_quantity_positive CHECK (quantity IS NULL OR quantity > 0),
  ADD CONSTRAINT invoices_subtotal_nonnegative
    CHECK (subtotal_amount IS NULL OR subtotal_amount >= 0),
  ADD CONSTRAINT invoices_discount_nonnegative
    CHECK (discount_amount IS NULL OR discount_amount >= 0),
  ADD CONSTRAINT invoices_snapshot_amounts_consistent CHECK (
    (unit_price_amount IS NULL AND subtotal_amount IS NULL)
    OR (
      unit_price_amount IS NOT NULL
      AND subtotal_amount IS NOT NULL
      AND quantity IS NOT NULL
      AND discount_amount IS NOT NULL
      AND unit_price_amount * quantity = subtotal_amount
      AND subtotal_amount - discount_amount = amount_due
    )
  );

CREATE FUNCTION public.protect_invoice_price_snapshot()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.unit_price_amount IS NULL
      OR NEW.subtotal_amount IS NULL
      OR NEW.quantity IS NULL
      OR NEW.discount_amount IS NULL
    THEN
      RAISE EXCEPTION 'New invoices require a complete price snapshot.';
    END IF;
  ELSIF
    NEW.unit_price_amount IS DISTINCT FROM OLD.unit_price_amount
    OR NEW.quantity IS DISTINCT FROM OLD.quantity
    OR NEW.subtotal_amount IS DISTINCT FROM OLD.subtotal_amount
    OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
    OR NEW.amount_due IS DISTINCT FROM OLD.amount_due
    OR NEW.currency IS DISTINCT FROM OLD.currency
  THEN
    RAISE EXCEPTION 'Invoice price snapshots are immutable.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER invoices_price_snapshot_insert_guard
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.protect_invoice_price_snapshot();
CREATE TRIGGER invoices_price_snapshot_update_guard
  BEFORE UPDATE OF unit_price_amount, quantity, subtotal_amount, discount_amount, amount_due, currency
  ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.protect_invoice_price_snapshot();

CREATE TABLE public.sales_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,
  supervisor_member_id uuid,
  position sales_member_position NOT NULL,
  full_name varchar(160) NOT NULL,
  member_code varchar(40) NOT NULL,
  phone varchar(40) NOT NULL,
  email varchar(320),
  region varchar(160) NOT NULL,
  status sales_member_status NOT NULL DEFAULT 'active',
  joined_at date NOT NULL DEFAULT CURRENT_DATE,
  referral_code varchar(40) NOT NULL,
  quota_amount numeric(14, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_members_member_code_nonempty CHECK (btrim(member_code) <> ''),
  CONSTRAINT sales_members_referral_code_nonempty CHECK (btrim(referral_code) <> ''),
  CONSTRAINT sales_members_full_name_nonempty CHECK (btrim(full_name) <> ''),
  CONSTRAINT sales_members_phone_nonempty CHECK (btrim(phone) <> ''),
  CONSTRAINT sales_members_region_nonempty CHECK (btrim(region) <> ''),
  CONSTRAINT sales_members_quota_nonnegative CHECK (quota_amount >= 0),
  CONSTRAINT sales_members_id_event_unique UNIQUE (id, event_id),
  CONSTRAINT sales_members_supervisor_same_event_fk
    FOREIGN KEY (supervisor_member_id, event_id)
    REFERENCES public.sales_members(id, event_id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX sales_members_member_code_unique
  ON public.sales_members (lower(member_code));
CREATE UNIQUE INDEX sales_members_referral_code_unique
  ON public.sales_members (lower(referral_code));
CREATE INDEX sales_members_event_position_status_idx
  ON public.sales_members (event_id, position, status);
CREATE INDEX sales_members_supervisor_status_idx
  ON public.sales_members (supervisor_member_id, status);

ALTER TABLE public.registrations
  ADD COLUMN seller_member_id uuid,
  ADD COLUMN referral_code_snapshot varchar(40),
  ADD CONSTRAINT registrations_seller_event_fk
    FOREIGN KEY (seller_member_id, event_id)
    REFERENCES public.sales_members(id, event_id) ON DELETE RESTRICT;
CREATE INDEX registrations_seller_member_idx
  ON public.registrations (seller_member_id, registered_at);

CREATE TABLE public.sales_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_member_id uuid NOT NULL REFERENCES public.sales_members(id) ON DELETE RESTRICT,
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE RESTRICT,
  entry_type sales_commission_entry_type NOT NULL,
  amount numeric(14, 2) NOT NULL,
  currency char(3) NOT NULL,
  idempotency_key varchar(160) NOT NULL,
  note varchar(1000),
  created_by_admin_user_id uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_commissions_idempotency_unique UNIQUE (idempotency_key),
  CONSTRAINT sales_commissions_amount_nonzero CHECK (amount <> 0),
  CONSTRAINT sales_commissions_earned_positive CHECK (
    entry_type <> 'earned' OR amount > 0
  ),
  CONSTRAINT sales_commissions_adjustment_invoice_required CHECK (
    entry_type <> 'adjustment' OR invoice_id IS NOT NULL
  )
);
CREATE INDEX sales_commissions_member_created_idx
  ON public.sales_commissions (sales_member_id, created_at DESC);
CREATE INDEX sales_commissions_registration_idx
  ON public.sales_commissions (registration_id, entry_type);
CREATE UNIQUE INDEX sales_commissions_one_earned_per_registration_idx
  ON public.sales_commissions (registration_id)
  WHERE entry_type = 'earned';

CREATE FUNCTION public.enforce_sales_member_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  parent_position sales_member_position;
  parent_status sales_member_status;
  active_count integer;
  required_parent_position sales_member_position;
BEGIN
  PERFORM 1 FROM public.events WHERE id = NEW.event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales member event does not exist.';
  END IF;

  IF NEW.position = 'arm' THEN
    IF NEW.supervisor_member_id IS NOT NULL THEN
      RAISE EXCEPTION 'An ARM must report directly to the Marketing Director.';
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

    SELECT count(*) INTO active_count
      FROM public.sales_members
      WHERE supervisor_member_id = NEW.supervisor_member_id
        AND status = 'active'
        AND (TG_OP = 'INSERT' OR id <> NEW.id);
    IF NEW.status = 'active' AND active_count >=
       (CASE NEW.position WHEN 'branch_manager' THEN 5 ELSE 2 END) THEN
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

CREATE TRIGGER sales_members_hierarchy_guard
  BEFORE INSERT OR UPDATE OF event_id, supervisor_member_id, position, status
  ON public.sales_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sales_member_hierarchy();

CREATE FUNCTION public.protect_registration_sales_attribution()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (
    NEW.seller_member_id IS DISTINCT FROM OLD.seller_member_id
    OR NEW.referral_code_snapshot IS DISTINCT FROM OLD.referral_code_snapshot
  ) AND current_setting('app.sales_attribution_correction', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Sales attribution can only be changed through the audited admin correction action.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER registrations_sales_attribution_guard
  BEFORE UPDATE OF seller_member_id, referral_code_snapshot
  ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.protect_registration_sales_attribution();

INSERT INTO public.permissions (code, name, description)
VALUES
  ('sales.read', 'View sales management', 'View the sales structure, sales reports, quotas, and commissions.'),
  ('sales.manage', 'Manage sales structure', 'Create and manage sales members, hierarchy, quotas, and audited attribution corrections.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.roles (code, name, description, is_system)
VALUES (
  'marketing_director',
  'Direktur Pemasaran',
  'Read-only access to assigned sales structures and performance.',
  true
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role_row.id, permission_row.id
FROM public.roles AS role_row
CROSS JOIN public.permissions AS permission_row
WHERE role_row.code = 'marketing_director'
  AND permission_row.code = 'sales.read'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role_row.id, permission_row.id
FROM public.roles AS role_row
CROSS JOIN public.permissions AS permission_row
WHERE role_row.code = 'admin_operator'
  AND permission_row.code IN ('sales.read', 'sales.manage')
ON CONFLICT DO NOTHING;

COMMIT;

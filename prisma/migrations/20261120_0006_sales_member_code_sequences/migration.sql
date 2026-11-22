BEGIN;

CREATE SEQUENCE public.sales_member_code_dir_seq
  AS bigint INCREMENT BY 1 MINVALUE 1 START WITH 1 NO CYCLE;
CREATE SEQUENCE public.sales_member_code_arm_seq
  AS bigint INCREMENT BY 1 MINVALUE 1 START WITH 1 NO CYCLE;
CREATE SEQUENCE public.sales_member_code_kcb_seq
  AS bigint INCREMENT BY 1 MINVALUE 1 START WITH 1 NO CYCLE;
CREATE SEQUENCE public.sales_member_code_sls_seq
  AS bigint INCREMENT BY 1 MINVALUE 1 START WITH 1 NO CYCLE;

SELECT setval(
  'public.sales_member_code_dir_seq'::regclass,
  GREATEST(COALESCE(MAX(substring(upper(member_code) FROM '^DIR-([0-9]{3,})$')::bigint), 1), 1),
  COALESCE(MAX(substring(upper(member_code) FROM '^DIR-([0-9]{3,})$')::bigint), 0) >= 1
)
FROM public.sales_persons
WHERE upper(member_code) ~ '^DIR-[0-9]{3,}$';

SELECT setval(
  'public.sales_member_code_arm_seq'::regclass,
  GREATEST(COALESCE(MAX(substring(upper(member_code) FROM '^ARM-([0-9]{3,})$')::bigint), 1), 1),
  COALESCE(MAX(substring(upper(member_code) FROM '^ARM-([0-9]{3,})$')::bigint), 0) >= 1
)
FROM public.sales_persons
WHERE upper(member_code) ~ '^ARM-[0-9]{3,}$';

SELECT setval(
  'public.sales_member_code_kcb_seq'::regclass,
  GREATEST(COALESCE(MAX(substring(upper(member_code) FROM '^KCB-([0-9]{3,})$')::bigint), 1), 1),
  COALESCE(MAX(substring(upper(member_code) FROM '^KCB-([0-9]{3,})$')::bigint), 0) >= 1
)
FROM public.sales_persons
WHERE upper(member_code) ~ '^KCB-[0-9]{3,}$';

SELECT setval(
  'public.sales_member_code_sls_seq'::regclass,
  GREATEST(COALESCE(MAX(substring(upper(member_code) FROM '^SLS-([0-9]{3,})$')::bigint), 1), 1),
  COALESCE(MAX(substring(upper(member_code) FROM '^SLS-([0-9]{3,})$')::bigint), 0) >= 1
)
FROM public.sales_persons
WHERE upper(member_code) ~ '^SLS-[0-9]{3,}$';

CREATE FUNCTION public.protect_sales_person_member_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.member_code IS DISTINCT FROM OLD.member_code THEN
    RAISE EXCEPTION 'Sales person member codes are immutable.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sales_persons_member_code_guard
  BEFORE UPDATE OF member_code ON public.sales_persons
  FOR EACH ROW EXECUTE FUNCTION public.protect_sales_person_member_code();

COMMIT;

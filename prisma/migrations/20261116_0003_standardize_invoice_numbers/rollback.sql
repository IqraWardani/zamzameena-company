BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.invoices
    WHERE legacy_invoice_number IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot roll back invoice numbering while invoices created after this migration exist.';
  END IF;
END
$$;

UPDATE public.invoices
SET invoice_number = legacy_invoice_number;

DROP INDEX public.invoices_legacy_number_unique;
ALTER TABLE public.invoices
  DROP COLUMN legacy_invoice_number;
DROP SEQUENCE public.invoice_number_seq;

COMMIT;

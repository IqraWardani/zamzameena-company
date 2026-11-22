BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.invoices AS i
    LEFT JOIN public.registrations AS r ON r.id = i.registration_id
    LEFT JOIN public.events AS e ON e.id = r.event_id
    WHERE r.id IS NULL
      OR e.id IS NULL
      OR e.timezone IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot standardize invoice numbers while an invoice has a missing registration, event, or event timezone.';
  END IF;
END
$$;

CREATE SEQUENCE public.invoice_number_seq AS bigint START WITH 1;

ALTER TABLE public.invoices
  ADD COLUMN legacy_invoice_number varchar(40);

ALTER TABLE public.invoices
  DROP CONSTRAINT invoices_number_unique;

WITH numbered_invoices AS (
  SELECT
    i.id,
    i.invoice_number AS legacy_invoice_number,
    extract(year FROM (e.starts_at AT TIME ZONE e.timezone))::integer AS event_year,
    row_number() OVER (
      ORDER BY r.registered_at ASC, r.id ASC, i.issued_at ASC, i.id ASC
    ) AS invoice_sequence
  FROM public.invoices AS i
  JOIN public.registrations AS r ON r.id = i.registration_id
  JOIN public.events AS e ON e.id = r.event_id
)
UPDATE public.invoices AS i
SET
  legacy_invoice_number = numbered.legacy_invoice_number,
  invoice_number = format(
    'ZAS-%s-%s',
    numbered.event_year,
    CASE
      WHEN numbered.invoice_sequence < 10000
        THEN lpad(numbered.invoice_sequence::text, 4, '0')
      ELSE numbered.invoice_sequence::text
    END
  )
FROM numbered_invoices AS numbered
WHERE i.id = numbered.id;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_number_unique UNIQUE (invoice_number);

CREATE UNIQUE INDEX invoices_legacy_number_unique
  ON public.invoices (legacy_invoice_number);

SELECT setval(
  'public.invoice_number_seq',
  GREATEST((SELECT count(*) FROM public.invoices), 1),
  (SELECT count(*) > 0 FROM public.invoices)
);

COMMIT;

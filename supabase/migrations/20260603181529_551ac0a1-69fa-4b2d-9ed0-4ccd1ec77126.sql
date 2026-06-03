
ALTER TABLE public.shops RENAME COLUMN payhero_channel_id TO payment_channel_id;
ALTER TABLE public.shops ALTER COLUMN payment_channel_id TYPE text USING payment_channel_id::text;
ALTER TABLE public.shops ADD COLUMN payment_api_key text;

ALTER TABLE public.sales RENAME COLUMN payhero_reference TO payment_reference;
ALTER TABLE public.sales RENAME COLUMN payhero_checkout_request_id TO payment_checkout_request_id;

ALTER TABLE public.subscription_payments RENAME COLUMN payhero_reference TO payment_reference;

ALTER TABLE public.subscription_payments ADD COLUMN plan TEXT CHECK (plan IN ('basic', 'pro')) DEFAULT 'basic';
CREATE INDEX idx_subscription_payments_plan ON public.subscription_payments(shop_id, plan);

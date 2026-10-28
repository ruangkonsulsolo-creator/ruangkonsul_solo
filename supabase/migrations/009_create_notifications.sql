-- Migration: 009_create_notifications

CREATE TYPE notification_channel AS ENUM ('in_app', 'whatsapp', 'email');

CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id    UUID REFERENCES public.orders(id),
  channel     notification_channel NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read)
  WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User dapat membaca notifikasi sendiri"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "User dapat menandai notifikasi sebagai dibaca"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

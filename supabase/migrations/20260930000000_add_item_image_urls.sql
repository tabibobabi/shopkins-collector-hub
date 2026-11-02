-- Dedicated slots for a listing's checklist illustration and real-life toy photo.
-- `images` / `cover_image_url` stay the gallery the app renders; these point at canonical references.
alter table public.items
  add column if not exists illustration_url text,
  add column if not exists real_life_image_url text;

comment on column public.items.illustration_url is
  'Official 2D Collector''s Tool / checklist artwork for this exact variant.';
comment on column public.items.real_life_image_url is
  'Photo of the physical toy for this exact variant.';

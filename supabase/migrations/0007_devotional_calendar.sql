-- 0007 — devotional calendar: festivals + the daily devotional schedule.
-- Content team schedules dates in admin; when a date has no row, the app
-- falls back to the weekday->deity mapping stored on deities.weekdays.

create table festivals (
  id uuid primary key default gen_random_uuid(),
  name_hi text not null,
  name_en text not null,
  on_date date not null,
  deity_id uuid references deities (id),
  greeting_item_id uuid references devotional_items (id),
  status content_status not null default 'draft'
);

create index festivals_date_idx on festivals (on_date);

alter table festivals enable row level security;
create policy "festivals: published read" on festivals for select
  using (status = 'published' or is_admin());
create policy "festivals: admin write" on festivals for all
  using (is_admin()) with check (is_admin());

create table daily_devotional (
  on_date date primary key,
  deity_id uuid not null references deities (id),
  shloka_item_id uuid references devotional_items (id),
  mantra_id uuid references mantras (id)
);

alter table daily_devotional enable row level security;
create policy "daily_devotional: public read" on daily_devotional for select using (true);
create policy "daily_devotional: admin write" on daily_devotional for all
  using (is_admin()) with check (is_admin());

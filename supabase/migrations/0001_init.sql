-- RoomLab schema. Enable anonymous sign-ins in the Supabase Auth settings
-- before the editor can save a project to an owner.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.catalog_items (
  id text primary key,
  brand text not null,
  category text not null,
  kind text not null,
  name text not null,
  width numeric not null,
  depth numeric not null,
  height numeric not null,
  price numeric not null,
  color text not null,
  color_name text not null,
  url text not null
);

create table if not exists public.projects (
  id text primary key,
  title text not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  unit text not null default 'm',
  slug text not null unique,
  is_public boolean not null default false,
  area numeric not null default 0,
  budget_total numeric not null default 0,
  budget_limit numeric not null default 1500,
  orientation numeric not null default 0,
  document jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.catalog_items enable row level security;
alter table public.projects enable row level security;

create policy "profiles read own" on public.profiles for select using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "catalog public read" on public.catalog_items for select using (true);
create policy "projects owner all" on public.projects for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "projects public read" on public.projects for select using (is_public = true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('room-assets', 'room-assets', true)
on conflict (id) do nothing;

create policy "room assets public read" on storage.objects for select using (bucket_id = 'room-assets');
create policy "room assets auth insert" on storage.objects for insert to authenticated with check (bucket_id = 'room-assets');

insert into public.catalog_items (id, brand, category, kind, name, width, depth, height, price, color, color_name, url) values
  ('generic-sofa', 'generic', 'living', 'sofa', 'Sofa', 240, 95, 85, 899, '#d8c3a5', 'beige', 'https://example.com/catalog/generic-sofa'),
  ('ikea-sofa', 'ikea', 'living', 'sofa', 'Strand Sofa', 228, 88, 80, 499, '#b9b4ae', 'gray', 'https://www.ikea.com/'),
  ('muji-sofa', 'muji', 'living', 'sofa', 'Plain Sofa', 200, 90, 78, 1200, '#ebe6dc', 'white', 'https://www.muji.com/'),
  ('westelm-sofa', 'west-elm', 'living', 'sofa', 'Haven Sofa', 240, 100, 86, 1800, '#2c3a4f', 'navy', 'https://www.westelm.com/'),
  ('generic-chair', 'generic', 'living', 'chair', 'Side Chair', 55, 55, 80, 180, '#6b4b32', 'walnut', 'https://example.com/catalog/generic-chair'),
  ('generic-coffee', 'generic', 'living', 'coffee-table', 'Coffee Table', 120, 60, 40, 220, '#6b4b32', 'walnut', 'https://example.com/catalog/generic-coffee'),
  ('generic-tv', 'generic', 'living', 'tv', 'Media Console', 160, 40, 50, 450, '#242424', 'black', 'https://example.com/catalog/generic-tv'),
  ('generic-lamp', 'generic', 'living', 'lamp', 'Arc Lamp', 40, 40, 160, 90, '#d8c3a5', 'beige', 'https://example.com/catalog/generic-lamp'),
  ('generic-bed', 'generic', 'bedroom', 'bed', 'Platform Bed', 160, 200, 100, 550, '#d8c3a5', 'beige', 'https://example.com/catalog/generic-bed'),
  ('ikea-bed', 'ikea', 'bedroom', 'bed', 'Fjord Bed', 140, 200, 90, 299, '#f4f1ea', 'white', 'https://www.ikea.com/'),
  ('muji-bed', 'muji', 'bedroom', 'bed', 'Low Bed', 160, 200, 80, 890, '#c4a574', 'oak', 'https://www.muji.com/'),
  ('westelm-bed', 'west-elm', 'bedroom', 'bed', 'Upholstered Bed', 180, 200, 120, 1400, '#2c3a4f', 'navy', 'https://www.westelm.com/'),
  ('generic-wardrobe', 'generic', 'bedroom', 'wardrobe', 'Wardrobe', 120, 60, 210, 700, '#6b4b32', 'walnut', 'https://example.com/catalog/generic-wardrobe'),
  ('ikea-wardrobe', 'ikea', 'bedroom', 'wardrobe', 'Compact Wardrobe', 100, 55, 180, 350, '#f4f1ea', 'white', 'https://www.ikea.com/'),
  ('generic-desk', 'generic', 'office', 'desk', 'Work Desk', 140, 70, 75, 220, '#6b4b32', 'walnut', 'https://example.com/catalog/generic-desk'),
  ('westelm-desk', 'west-elm', 'office', 'desk', 'Studio Desk', 160, 70, 75, 640, '#6b4b32', 'walnut', 'https://www.westelm.com/'),
  ('generic-office-chair', 'generic', 'office', 'office-chair', 'Office Chair', 65, 65, 110, 160, '#242424', 'black', 'https://example.com/catalog/generic-office-chair'),
  ('muji-chair', 'muji', 'office', 'office-chair', 'Task Chair', 60, 60, 95, 240, '#b9b4ae', 'gray', 'https://www.muji.com/')
on conflict (id) do nothing;

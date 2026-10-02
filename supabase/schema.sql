-- ============================================================
-- Jéssica Laysa Acessórios — schema Supabase
-- Rode este script inteiro em: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ---------- categorias ----------
create table if not exists categories (
  id text primary key,
  name text not null,
  img text,
  description text,
  icon text default 'tag',
  "order" int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- produtos ----------
create table if not exists products (
  id bigint generated always as identity primary key,
  name text not null,
  cat text not null references categories(id) on update cascade,
  brand text default 'Jéssica Laysa',
  sku text,
  short_desc text,
  full_desc text,
  price numeric(10,2) not null,
  promo numeric(10,2),
  stock int,
  min_stock int,
  max_parcelas int,
  featured boolean not null default false,
  is_launch boolean not null default false,
  "order" int not null default 0,
  gallery jsonb not null default '[]'::jsonb,       -- array de URLs (fotos de ângulos diferentes)
  variant_axes jsonb not null default '{"color":true,"size":false,"model":false}'::jsonb,
  variants jsonb not null default '[]'::jsonb,       -- array de {color,size,model,img,price,stock,sku}
  created_at timestamptz not null default now()
);

-- ---------- banners do carrossel do topo ----------
create table if not exists banners (
  id bigint generated always as identity primary key,
  title text,
  subtitle text,
  img_desktop text,
  img_mobile text,
  btn_text text,
  btn_link text,
  "order" int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security: qualquer visitante pode LER;
-- só um admin autenticado (Supabase Auth) pode ESCREVER.
-- ============================================================
alter table categories enable row level security;
alter table products   enable row level security;
alter table banners    enable row level security;

create policy "public read categories" on categories for select using (true);
create policy "public read products"   on products   for select using (true);
create policy "public read banners"    on banners    for select using (true);

create policy "auth write categories" on categories for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth write products" on products for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth write banners" on banners for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- Storage: bucket público para as fotos dos produtos/categorias/banners
-- ============================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "public read product-images" on storage.objects for select
  using (bucket_id = 'product-images');
create policy "auth upload product-images" on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "auth update product-images" on storage.objects for update
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "auth delete product-images" on storage.objects for delete
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

-- ============================================================
-- Dados iniciais: categorias (Semi Joias / Óculos)
-- ============================================================
insert into categories (id, name, img, description, icon, "order") values
  ('semijoias', 'Semi Joias', null, 'Peças banhadas a ouro 18k, selecionadas uma a uma.', 'gem', 1),
  ('oculos', 'Óculos', null, 'Óculos solares e de grau com curadoria própria.', 'glasses', 2)
on conflict (id) do nothing;

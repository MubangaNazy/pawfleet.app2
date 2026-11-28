-- Shop marketplace rules: each shop manages only its own products, and orders are private.
--
-- Products: anyone can browse. Only a shop owner account can add products, and only under its own id;
--           a shop can edit or delete only its own. Admins can do everything.
-- Orders:   visible to the buyer, the shop that sells it, and admins. A buyer can place an order for
--           themselves (pay on delivery); paid orders are written by the server. Only the shop or an
--           admin can change an order afterwards.
-- The ::text casts work whether the id columns are uuid or text.

-- ── shop_products ───────────────────────────────────────────────────────────
alter table public.shop_products enable row level security;
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'shop_products' loop
    execute format('drop policy %I on public.shop_products', r.policyname);
  end loop;
end $$;

create policy shop_products_browse on public.shop_products for select to anon, authenticated using (true);

create policy shop_products_insert on public.shop_products for insert to authenticated
  with check (
    public.pf_is_admin()
    or (shop_owner_id::text = auth.uid()::text
        and exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'shopowner'))
  );

create policy shop_products_update on public.shop_products for update to authenticated
  using (public.pf_is_admin() or shop_owner_id::text = auth.uid()::text)
  with check (public.pf_is_admin() or shop_owner_id::text = auth.uid()::text);

create policy shop_products_delete on public.shop_products for delete to authenticated
  using (public.pf_is_admin() or shop_owner_id::text = auth.uid()::text);

-- ── shop_orders ─────────────────────────────────────────────────────────────
alter table public.shop_orders enable row level security;
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'shop_orders' loop
    execute format('drop policy %I on public.shop_orders', r.policyname);
  end loop;
end $$;

create policy shop_orders_read on public.shop_orders for select to authenticated
  using (public.pf_is_admin() or buyer_id::text = auth.uid()::text or shop_owner_id::text = auth.uid()::text);

create policy shop_orders_insert on public.shop_orders for insert to authenticated
  with check (buyer_id::text = auth.uid()::text or public.pf_is_admin());

create policy shop_orders_update on public.shop_orders for update to authenticated
  using (public.pf_is_admin() or shop_owner_id::text = auth.uid()::text)
  with check (public.pf_is_admin() or shop_owner_id::text = auth.uid()::text);

create policy shop_orders_delete on public.shop_orders for delete to authenticated
  using (public.pf_is_admin());

-- Check afterwards:
--   select tablename, policyname, cmd from pg_policies where tablename in ('shop_products', 'shop_orders') order by 1, 2;

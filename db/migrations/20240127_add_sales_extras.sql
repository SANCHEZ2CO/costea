-- Add extras columns to sales table
alter table sales add column if not exists extras_amount numeric default 0;
alter table sales add column if not exists extras_details text;

-- Update register_sale function to include new fields
create or replace function register_sale(
  p_sale_total numeric,
  p_payment_method text,
  p_items jsonb,
  p_customer_name text default 'Cliente Mostrador',
  p_customer_phone text default null,
  p_delivery_fee numeric default 0,
  p_extras_amount numeric default 0,
  p_extras_details text default null
) returns uuid as $$
declare
  new_sale_id uuid;
  item jsonb;
  dish_rec record;
  ing_rec record;
  needed_qty numeric;
  pm_id uuid;
  sale_cost numeric := 0;
  dish_total_cost numeric;
begin
  -- Resolver Payment Method ID
  -- Try exact match first
  select id into pm_id from payment_methods where lower(name) = lower(p_payment_method) limit 1;
  
  -- If not found (and not empty), try to find partial match or fallback
  if pm_id is null then
     select id into pm_id from payment_methods where active = true limit 1;
  end if;

  -- 1. Crear Venta
  insert into sales (
    total_sale, 
    payment_method_id, 
    customer_name, 
    customer_phone, 
    delivery_fee, 
    extras_amount, 
    extras_details
  )
  values (
    p_sale_total, 
    pm_id, 
    p_customer_name, 
    p_customer_phone, 
    p_delivery_fee, 
    p_extras_amount, 
    p_extras_details
  )
  returning id into new_sale_id;

  -- 2. Procesar Items
  for item in select * from jsonb_array_elements(p_items)
  loop
    -- Registrar Sale Item
    insert into sale_items (sale_id, dish_id, quantity, unit_price)
    values (new_sale_id, (item->>'dish_id')::uuid, (item->>'quantity')::numeric, (item->>'price')::numeric);

    -- Deduct Inventory logic
    for ing_rec in 
      select di.ingredient_id, di.used_quantity, di.used_unit, i.purchase_price, i.purchase_quantity
      from dish_ingredients di
      join ingredients i on i.id = di.ingredient_id
      where di.dish_id = (item->>'dish_id')::uuid
    loop
        needed_qty := ing_rec.used_quantity * (item->>'quantity')::numeric;
        
        update ingredients
        set purchase_quantity = purchase_quantity - needed_qty
        where id = ing_rec.ingredient_id;

        insert into inventory_movements (ingredient_id, type, quantity, date, description)
        values (ing_rec.ingredient_id, 'VENTA', -needed_qty, now(), 'Venta #' || substring(new_sale_id::text, 1, 8));
    end loop;
    
    -- Calculate Sale Cost (Recipe Cost)
    select total_cost into dish_total_cost from dishes where id = (item->>'dish_id')::uuid;
    sale_cost := sale_cost + (coalesce(dish_total_cost, 0) * (item->>'quantity')::numeric);

  end loop;

  -- Actualizar Costo Total de la Venta en la tabla sales
  update sales set total_cost = sale_cost where id = new_sale_id;

  return new_sale_id;
end;
$$ language plpgsql;

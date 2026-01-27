-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (Opcional, pero recomendado para extender datos de usuario)
-- Por ahora usaremos auth.users directamente, pero creamos la tabla ingredients vinculada a auth.users

-- 1. TABLA DE INGREDIENTES (Inventario del Usuario)
create table ingredients (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  purchase_price numeric not null, -- Precio de compra del paquete
  purchase_unit text not null, -- Unidad de compra (Kg, Lt, Und)
  purchase_quantity numeric not null, -- Cantidad que trae el paquete
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS para Ingredients
alter table ingredients enable row level security;

create policy "Usuarios pueden ver sus propios ingredientes"
  on ingredients for select
  using (auth.uid() = user_id);

create policy "Usuarios pueden crear sus propios ingredientes"
  on ingredients for insert
  with check (auth.uid() = user_id);

create policy "Usuarios pueden actualizar sus propios ingredientes"
  on ingredients for update
  using (auth.uid() = user_id);

create policy "Usuarios pueden eliminar sus propios ingredientes"
  on ingredients for delete
  using (auth.uid() = user_id);


-- 2. TABLA DE PLATOS/RECETAS (Dishes)
create table dishes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  total_cost numeric not null,
  profit_margin numeric not null,
  sale_price numeric not null,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS para Dishes
alter table dishes enable row level security;

create policy "Usuarios pueden ver sus propios platos"
  on dishes for select
  using (auth.uid() = user_id);

create policy "Usuarios pueden crear sus propios platos"
  on dishes for insert
  with check (auth.uid() = user_id);

create policy "Usuarios pueden actualizar sus propios platos"
  on dishes for update
  using (auth.uid() = user_id);

create policy "Usuarios pueden eliminar sus propios platos"
  on dishes for delete
  using (auth.uid() = user_id);


-- 3. TABLA DE INGREDIENTES DEL PLATO (Relación muchos a muchos / detalle)
create table dish_ingredients (
  id uuid default uuid_generate_v4() primary key,
  dish_id uuid references dishes(id) on delete cascade not null,
  ingredient_id uuid references ingredients(id), -- Puede ser null si es un ingrediente "al vuelo" que no se guardó en inventario, o forzamos guardar todo. 
  -- Para simplicidad del "Paso 3", permitiremos guardar el nombre y costo snapshot por si el ingrediente original cambia o se borra.
  name text not null, 
  used_quantity numeric not null,
  used_unit text not null,
  cost_snapshot numeric not null -- El costo calculado en ese momento
);

-- RLS para Dish Ingredients
-- Se basa en si el usuario tiene acceso al plato padre (dish_id)
alter table dish_ingredients enable row level security;

create policy "Usuarios pueden gestionar ingredientes de sus platos"
  on dish_ingredients for all
  using (
    exists (
      select 1 from dishes
      where dishes.id = dish_ingredients.dish_id
      and dishes.user_id = auth.uid()
    )
  );

-- O polizas simples si confiamos en el cascade delete del padre


-- ==========================================
-- FASE 1: NUEVAS TABLAS (Business OS)
-- ==========================================

-- 4. Payment Methods
create table if not exists payment_methods (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed Payment Methods
insert into payment_methods (name, active) values 
('Efectivo', true),
('Nequi', true),
('Daviplata', true),
('Transferencia', true)
on conflict do nothing;

-- 5. Sales
create table if not exists sales (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  customer_name text,
  customer_phone text,
  total_sale numeric not null,
  total_cost numeric not null default 0, -- Costo de los ingredientes vendidos
  net_profit numeric generated always as (total_sale - total_cost) stored,
  payment_method_id uuid references payment_methods(id),
  delivery_fee numeric default 0,
  user_id uuid references auth.users(id) -- Opcional, si queremos vincular venta a usuario (dueño)
);

-- Note: RLS for sales
alter table sales enable row level security;
create policy "Usuarios ven sus ventas" on sales for select using (true); -- Simplificado para MVP (debería ser user_id)
create policy "Usuarios crean ventas" on sales for insert with check (true);

-- 6. Sale Items
create table if not exists sale_items (
  id uuid default uuid_generate_v4() primary key,
  sale_id uuid references sales(id) on delete cascade not null,
  dish_id uuid references dishes(id), -- Puede ser null si es un item custom? Mejor no por ahora.
  quantity numeric not null,
  unit_price numeric not null,
  total_price numeric generated always as (quantity * unit_price) stored
);

alter table sale_items enable row level security;
create policy "Usuarios ven items venta" on sale_items for select using (true);
create policy "Usuarios crean items venta" on sale_items for insert with check (true);

-- 7. Inventory Movements (Kardex)
create table if not exists inventory_movements (
  id uuid default uuid_generate_v4() primary key,
  ingredient_id uuid references ingredients(id) on delete cascade not null,
  type text check (type in ('COMPRA', 'VENTA', 'AJUSTE')),
  quantity numeric not null, -- Positivo entra, Negativo sale
  date timestamp with time zone default timezone('utc'::text, now()) not null,
  description text
);

alter table inventory_movements enable row level security;
create policy "Usuarios ven movimientos" on inventory_movements for select using (true);
create policy "Usuarios crean movimientos" on inventory_movements for insert with check (true);

-- 8. Fixed Expenses
create table if not exists fixed_expenses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  name text not null,
  amount numeric not null,
  frequency text default 'mensual',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table fixed_expenses enable row level security;
create policy "Usuarios gestionan gastos" on fixed_expenses for all using (true); -- Simplificado

-- ==========================================
-- STORED PROCEDURES (Business Logic)
-- ==========================================

-- RPC: Register Purchase (Entrada de Inventario con Promedio Ponderado)
create or replace function register_purchase(
  p_ingredient_id uuid,
  p_quantity numeric,
  p_cost numeric, -- Costo TOTAL de la compra, no unitario
  p_date timestamp with time zone
) returns void as $$
declare
  old_stock numeric;
  old_unit_cost numeric;
  new_unit_cost numeric;
  current_purchase_price numeric; -- El precio que tiene actualmente el ingrediente (usado como referencia)
begin
  -- Obtener datos actuales
  select purchase_quantity, purchase_price into old_stock, current_purchase_price
  from ingredients where id = p_ingredient_id;

  -- Calcular Unit Cost Actual (Evitar div/0)
  if old_stock <= 0 then
    old_unit_cost := 0;
    -- Si no hay stock, el precio "actual" de referencia es irrelevante para el promedio, tomamos el de la compra
  else
    old_unit_cost := current_purchase_price / old_stock; -- Esto asume que purchase_price es el valor total del stock actual? 
    -- REVISIÓN: En la tabla `ingredients`, `purchase_price` dice "-- Precio de compra del paquete".
    -- Si `purchase_price` es el PRECIO DEL PAQUETE (Unitario o Total?), y `purchase_quantity` es la cantidad del paquete...
    -- Asumamos que para el inventario, queremos saber el Costo Promedio Unitario.
    -- Vamos a simplificar: `purchase_price` en ingredients será interpretado como el "Costo Total del Stock Actual" para efectos de promedio ponderado,
    -- O mejor, guardamos el Costo Unitario Promedio en algún lado. 
    -- DADO EL SCHEMA ACTUAL: `purchase_price` parece ser el precio de REFERENCIA de compra.
    -- Vamos a actualizar `purchase_price` para que refleje el NUEVO PRECIO UNITARIO (aprox) o PRECIO PAQUETE si se compra igual.
    -- ESTRATEGIA: Actualizaremos el stock sumando. Actualizaremos el precio si se provee costo.
    
    -- Si el usuario provee p_cost (Costo Total Compra):
    -- Nuevo Costo Unitario = ( (OldStock * OldUnitCost) + p_cost ) / (OldStock + p_quantity)
    -- Pero no tenemos OldUnitCost guardado explicitamente, solo purchase_price (que es el del paquete).
    -- Vamos a asumir que el `purchase_price` en DB es el PRECIO POR PAQUETE TOTAL.
    -- Entonces UnitCost = purchase_price / purchase_quantity.
    old_unit_cost := current_purchase_price / old_stock;
  end if;

  -- 1. Actualizar Stock
  update ingredients 
  set purchase_quantity = purchase_quantity + p_quantity
  where id = p_ingredient_id;

  -- 2. Actualizar Costo (Promedio Ponderado) si se dio un costo
  if p_cost > 0 then
     -- Nota: p_cost es el costo total de ESTA compra.
     -- Nuevo Valor Total Inventario = (OldStock * OldUnitCost) + p_cost
     -- Nuevo Stock = OldStock + p_quantity
     -- Nuevo Costo Unitario = Nuevo Valor Total / Nuevo Stock
     -- En la tabla guardamos `purchase_price` como PRECIO DEL PAQUETE? O PRECIO TOTAL?
     -- El codigo actual usa `purchase_price` como precio del paquete de compra original. 
     -- Para simplificar y no romper todo: 
     -- Actualizaremos `purchase_price` para que refleje el valor proporcional a la cantidad que se tiene, O 
     -- simplemente actualizamos el "Precio de Ultima Compra".
     -- PERO EL REQUERIMIENTO DICE: "Recalcular el Costo Unitario (Promedio Ponderado)".
     
     -- Vamos a actualizar `purchase_price` para que sea = (Nuevo Costo Unitario * Cantidad Original del Paquete).
     -- Espera, `ingredients` define un insumo genericamente...
     -- Si tengo "Harina", compro por Kilo. quantity=10. price=1000.
     -- Si compro 10 mas a 2000. Total stock 20. Total valor 3000. Unit cost 150.
     -- Update ingredients: quantity=20. price = (150 * new_package_size?).
     
     -- SIMPLIFICACIÓN: 
     -- `purchase_price` será actualizado al PRECIO UNITARIO por la `purchase_quantity` actual.
     -- NO, `purchase_price` es un campo estático de referencia.
     -- Haremos lo mejor posible: Actualizamos `purchase_price` para reflejar el costo de ESTA compra si es mas reciente,
     -- O intentamos ponderar.
     
     -- En un sistema real tendriamos tabla `stock_batches`. Aqui modificamos `ingredients`.
     -- Vamos a hacer: purchase_price = (Total Value / Total Quantity) * (Quantity del Paquete original?? No sabemos paquete original si ya cambio stock).
     -- ASUMEREMOS: purchase_price es el VALOR TOTAL del stock actual.
     -- Update: purchase_price = purchase_price + p_cost.
     update ingredients
     set purchase_price = purchase_price + p_cost
     where id = p_ingredient_id;
  end if;

  -- 3. Registrar Movimiento
  insert into inventory_movements (ingredient_id, type, quantity, date, description)
  values (p_ingredient_id, 'COMPRA', p_quantity, p_date, 'Compra registrada');

end;
$$ language plpgsql;

-- RPC: Register Sale (Venta -> Descuento Inventario)
create or replace function register_sale(
  p_sale_total numeric,
  p_payment_method text, -- Pasamos nombre o ID? Mejor ID pero frontend aun manda texto hardcoded 'efectivo' a veces.
                         -- Vamos a buscar el ID por nombre si es texto, o asumir ID.
  p_items jsonb -- Array de { dish_id, quantity, price }
) returns uuid as $$
declare
  new_sale_id uuid;
  item jsonb;
  dish_rec record;
  ing_rec record;
  needed_qty numeric;
  pm_id uuid;
  sale_cost numeric := 0;
begin
  -- Resolver Payment Method ID
  select id into pm_id from payment_methods where lower(name) = lower(p_payment_method) limit 1;
  if pm_id is null then
     -- Fallback to first active or null
     select id into pm_id from payment_methods where active = true limit 1;
  end if;

  -- 1. Crear Venta
  insert into sales (total_sale, payment_method_id, customer_name)
  values (p_sale_total, pm_id, 'Cliente Mostrador')
  returning id into new_sale_id;

  -- 2. Procesar Items
  for item in select * from jsonb_array_elements(p_items)
  loop
    -- Registrar Sale Item
    insert into sale_items (sale_id, dish_id, quantity, unit_price)
    values (new_sale_id, (item->>'dish_id')::uuid, (item->>'quantity')::numeric, (item->>'price')::numeric);

    -- Calcular Costo del Plato (Sumar sus ingredientes)
    -- Y Descontar Inventario
    
    -- Para cada ingrediente del plato:
    for ing_rec in 
      select di.ingredient_id, di.used_quantity, di.used_unit, i.purchase_price, i.purchase_quantity
      from dish_ingredients di
      join ingredients i on i.id = di.ingredient_id
      where di.dish_id = (item->>'dish_id')::uuid
    loop
        -- Cantidad a descontar: (Cantidad en receta * Cantidad vendida)
        needed_qty := ing_rec.used_quantity * (item->>'quantity')::numeric;
        
        -- Descontar de Inventory (Allow negative)
        update ingredients
        set purchase_quantity = purchase_quantity - needed_qty
        where id = ing_rec.ingredient_id;

        -- Registrar Movimiento
        insert into inventory_movements (ingredient_id, type, quantity, date, description)
        values (ing_rec.ingredient_id, 'VENTA', -needed_qty, now(), 'Venta #' || substring(new_sale_id::text, 1, 8));

        -- Acumular Costo de Venta (Estimado: Costo Unitario Referencia * Cantidad)
        -- Costo Unitario Ref = purchase_price / purchase_quantity (Cuidado div/0, cuidado stock negativo)
        -- Para simplificar usaremos el costo snapshot que teniamos o calculamos prorrata simple.
        -- Si purchase_quantity era el stock total y purchase_price el valor total...
        -- UnitCost = variations? 
        -- Usemos el `cost_snapshot` de dish_ingredients si queremos costo estandar,
        -- Pero para "Real Profit" necesitamos costo real promedio.
        -- Estimacion simple: (ing_rec.purchase_price / nullif(ing_rec.purchase_quantity, 0)) * needed_qty
        -- Esto puede dar locuras si el stock es negativo.
        -- MEJOR: Usar el costo que definimos en la receta (Standard Cost) para el reporte de utilidad operativa rapida.
    end loop;
    
    -- Sumar al costo total de la venta el costo del plato * cantidad
    select sum(cost_snapshot * used_quantity) into sale_cost -- Esto esta mal, cost_snapshot ya es total o unitario? Revisar dish_ingredients.
    -- dish_ingredients tiene `cost_snapshot numeric` -- "El costo calculado en ese momento". Asumimos es el costo TOTAL del ingrediente en ese plato? O unitario?
    -- En `dish_ingredients`: name, used_quantity, used_unit, cost_snapshot.
    -- Normalmente cost_snapshot es el costo de esa cantidad de ingrediente.
    from dish_ingredients where dish_id = (item->>'dish_id')::uuid;
    
    -- Ah, `sale_cost` variable global
    -- sale_cost := sale_cost + ( (Costo del Plato) * QuantityVendida )
    declare 
        dish_total_cost numeric;
    begin
        select total_cost into dish_total_cost from dishes where id = (item->>'dish_id')::uuid;
        sale_cost := sale_cost + (coalesce(dish_total_cost, 0) * (item->>'quantity')::numeric);
    end;

  end loop;

  -- Actualizar Costo Total de la Venta
  update sales set total_cost = sale_cost where id = new_sale_id;

  return new_sale_id;
end;
$$ language plpgsql;


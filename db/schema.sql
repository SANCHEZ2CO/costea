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

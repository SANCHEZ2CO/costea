-- ==========================================
-- OUTFLOW MODAL: Database Support Migration
-- ==========================================
-- This migration adds expense tracking and updates inventory purchases
-- to support the unified OutflowModal component.

-- 1. EXPENSE CATEGORIES TABLE
-- Allows users to create and manage expense categories dynamically
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  icon TEXT DEFAULT '💰',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. CUSTOMERS TABLE (clientes para ventas y cobros)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios ven clientes" ON customers FOR SELECT USING (true);
CREATE POLICY "Usuarios crean clientes" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuarios actualizan clientes" ON customers FOR UPDATE USING (true);
CREATE POLICY "Usuarios eliminan clientes" ON customers FOR DELETE USING (true);

-- 3. PROVIDERS TABLE (proveedores para compras)
CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  category TEXT, -- Tipo de proveedor (Insumos, Servicios, etc)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for providers
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios ven proveedores" ON providers FOR SELECT USING (true);
CREATE POLICY "Usuarios crean proveedores" ON providers FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuarios actualizan proveedores" ON providers FOR UPDATE USING (true);
CREATE POLICY "Usuarios eliminan proveedores" ON providers FOR DELETE USING (true);

-- Seed default categories
INSERT INTO expense_categories (name, icon) VALUES 
  ('Arriendo', '🏠'),
  ('Nómina', '👥'),
  ('Servicios', '💡'),
  ('Publicidad', '📢'),
  ('Transporte', '🚚'),
  ('Mantenimiento', '🔧'),
  ('Otros', '📋')
ON CONFLICT DO NOTHING;

-- RLS for expense_categories
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven categorias" ON expense_categories FOR SELECT USING (true);
CREATE POLICY "Usuarios crean categorias" ON expense_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuarios actualizan categorias" ON expense_categories FOR UPDATE USING (true);

-- 2. EXPENSES TABLE
-- Tracks operational expenses that do NOT affect inventory
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  category_id UUID REFERENCES expense_categories(id),
  amount NUMERIC NOT NULL,
  provider TEXT,
  payment_method_id UUID REFERENCES payment_methods(id),
  date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven gastos" ON expenses FOR SELECT USING (true);
CREATE POLICY "Usuarios crean gastos" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Usuarios actualizan gastos" ON expenses FOR UPDATE USING (true);
CREATE POLICY "Usuarios eliminan gastos" ON expenses FOR DELETE USING (true);

-- 3. UPDATE INVENTORY_MOVEMENTS
-- Add cost_unit and provider for better purchase tracking
ALTER TABLE inventory_movements 
  ADD COLUMN IF NOT EXISTS cost_unit NUMERIC,
  ADD COLUMN IF NOT EXISTS provider TEXT;

-- 4. REGISTER_EXPENSE RPC
-- Inserts an expense record (does NOT touch inventory)
CREATE OR REPLACE FUNCTION register_expense(
  p_category_id UUID,
  p_amount NUMERIC,
  p_provider TEXT DEFAULT NULL,
  p_payment_method_id UUID DEFAULT NULL,
  p_date TIMESTAMPTZ DEFAULT now(),
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_expense_id UUID;
BEGIN
  INSERT INTO expenses (
    user_id,
    category_id,
    amount,
    provider,
    payment_method_id,
    date,
    notes
  ) VALUES (
    auth.uid(),
    p_category_id,
    p_amount,
    p_provider,
    p_payment_method_id,
    p_date,
    p_notes
  )
  RETURNING id INTO new_expense_id;
  
  RETURN new_expense_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. UPDATED REGISTER_PURCHASE RPC
-- Now implements Weighted Average Cost calculation
-- Formula: NewCost = ((OldStock × OldUnitCost) + (NewQty × NewUnitCost)) / (OldStock + NewQty)
CREATE OR REPLACE FUNCTION register_purchase(
  p_ingredient_id UUID,
  p_quantity NUMERIC,
  p_cost NUMERIC, -- Total cost of this purchase (NOT unit cost)
  p_date TIMESTAMPTZ,
  p_provider TEXT DEFAULT NULL
) RETURNS TABLE(
  old_stock NUMERIC,
  new_stock NUMERIC,
  old_unit_cost NUMERIC,
  new_unit_cost NUMERIC
) AS $$
DECLARE
  v_old_stock NUMERIC;
  v_old_total_value NUMERIC;
  v_old_unit_cost NUMERIC;
  v_new_stock NUMERIC;
  v_new_total_value NUMERIC;
  v_new_unit_cost NUMERIC;
  v_purchase_unit_cost NUMERIC;
BEGIN
  -- Get current ingredient data
  SELECT 
    purchase_quantity, 
    purchase_price 
  INTO v_old_stock, v_old_total_value
  FROM ingredients 
  WHERE id = p_ingredient_id;

  -- Calculate old unit cost (avoid division by zero)
  IF v_old_stock IS NULL OR v_old_stock <= 0 THEN
    v_old_stock := 0;
    v_old_unit_cost := 0;
    v_old_total_value := 0;
  ELSE
    v_old_unit_cost := v_old_total_value / v_old_stock;
  END IF;

  -- Calculate new values
  v_new_stock := v_old_stock + p_quantity;
  
  -- Calculate purchase unit cost
  IF p_quantity > 0 AND p_cost > 0 THEN
    v_purchase_unit_cost := p_cost / p_quantity;
  ELSE
    v_purchase_unit_cost := v_old_unit_cost;
  END IF;

  -- Weighted Average Cost Calculation
  IF p_cost > 0 AND v_new_stock > 0 THEN
    -- New Total Value = Old Total Value + New Purchase Cost
    v_new_total_value := v_old_total_value + p_cost;
    -- New Unit Cost = New Total Value / New Stock
    v_new_unit_cost := v_new_total_value / v_new_stock;
  ELSE
    -- If no cost provided, keep existing unit cost
    v_new_total_value := v_old_total_value;
    v_new_unit_cost := v_old_unit_cost;
  END IF;

  -- 1. Update Ingredient: stock and total value
  UPDATE ingredients 
  SET 
    purchase_quantity = v_new_stock,
    purchase_price = v_new_total_value
  WHERE id = p_ingredient_id;

  -- 2. Record inventory movement with cost tracking
  INSERT INTO inventory_movements (
    ingredient_id, 
    type, 
    quantity, 
    date, 
    description,
    cost_unit,
    provider
  ) VALUES (
    p_ingredient_id, 
    'COMPRA', 
    p_quantity, 
    p_date, 
    'Compra registrada - Costo: $' || p_cost::TEXT,
    v_purchase_unit_cost,
    p_provider
  );

  -- Return the stock change information for UI feedback
  RETURN QUERY SELECT 
    v_old_stock AS old_stock,
    v_new_stock AS new_stock,
    v_old_unit_cost AS old_unit_cost,
    v_new_unit_cost AS new_unit_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- SISTEMA CONTABLE: Terceros y Movimientos
-- Migration: add_terceros_and_movimientos
-- ==========================================

-- 1. SERVICE_TYPES (tipos de servicio predefinidos)
CREATE TABLE IF NOT EXISTS service_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_types_select" ON service_types FOR SELECT USING (true);
CREATE POLICY "service_types_insert" ON service_types FOR INSERT WITH CHECK (true);
CREATE POLICY "service_types_update" ON service_types FOR UPDATE USING (true);
CREATE POLICY "service_types_delete" ON service_types FOR DELETE USING (true);

-- Seed default service types
INSERT INTO service_types (name, is_default) VALUES 
  ('Arriendo', true),
  ('Servicios Públicos', true),
  ('Nómina', true),
  ('Publicidad', true),
  ('Mantenimiento', true),
  ('Transporte', true),
  ('Otros', true)
ON CONFLICT DO NOTHING;

-- 2. SERVICES (servicios/gastos operativos recurrentes)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  service_type_id UUID REFERENCES service_types(id),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_select" ON services FOR SELECT USING (true);
CREATE POLICY "services_insert" ON services FOR INSERT WITH CHECK (true);
CREATE POLICY "services_update" ON services FOR UPDATE USING (true);
CREATE POLICY "services_delete" ON services FOR DELETE USING (true);

-- 3. AGREGAR NIT A PROVIDERS (no destructivo)
ALTER TABLE providers ADD COLUMN IF NOT EXISTS nit TEXT;

-- 4. MOVEMENTS (documento cabecera de transacciones)
CREATE TABLE IF NOT EXISTS movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT CHECK (type IN ('COMPRA', 'VENTA', 'GASTO', 'AJUSTE')) NOT NULL,
  document_number TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  
  customer_id UUID REFERENCES customers(id),
  provider_id UUID REFERENCES providers(id),
  service_id UUID REFERENCES services(id),
  
  status TEXT CHECK (status IN ('BORRADOR', 'CONFIRMADO', 'ANULADO')) DEFAULT 'CONFIRMADO',
  subtotal NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  attachment_url TEXT,
  sale_id UUID REFERENCES sales(id),
  expense_id UUID REFERENCES expenses(id),
  
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_movements_type ON movements(type);
CREATE INDEX IF NOT EXISTS idx_movements_date ON movements(date);
CREATE INDEX IF NOT EXISTS idx_movements_status ON movements(status);
CREATE INDEX IF NOT EXISTS idx_movements_user ON movements(user_id);

ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movements_select" ON movements FOR SELECT USING (true);
CREATE POLICY "movements_insert" ON movements FOR INSERT WITH CHECK (true);
CREATE POLICY "movements_update" ON movements FOR UPDATE USING (true);

-- 5. MOVEMENT_LINES (líneas de detalle del documento)
CREATE TABLE IF NOT EXISTS movement_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  movement_id UUID REFERENCES movements(id) ON DELETE CASCADE NOT NULL,
  
  ingredient_id UUID REFERENCES ingredients(id),
  dish_id UUID REFERENCES dishes(id),
  expense_category_id UUID REFERENCES expense_categories(id),
  
  description TEXT,
  quantity NUMERIC DEFAULT 1,
  unit_cost NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  line_total NUMERIC DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE movement_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movement_lines_select" ON movement_lines FOR SELECT USING (true);
CREATE POLICY "movement_lines_insert" ON movement_lines FOR INSERT WITH CHECK (true);
CREATE POLICY "movement_lines_update" ON movement_lines FOR UPDATE USING (true);
CREATE POLICY "movement_lines_delete" ON movement_lines FOR DELETE USING (true);

-- 6. FUNCIÓN PARA GENERAR CONSECUTIVOS
CREATE OR REPLACE FUNCTION get_next_document_number(p_type TEXT, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  next_num INT;
BEGIN
  prefix := CASE p_type
    WHEN 'COMPRA' THEN 'COM'
    WHEN 'VENTA' THEN 'VEN'
    WHEN 'GASTO' THEN 'GAS'
    WHEN 'AJUSTE' THEN 'AJU'
    ELSE 'MOV'
  END;
  
  SELECT COALESCE(MAX(SUBSTRING(document_number FROM 4)::INT), 0) + 1
  INTO next_num
  FROM movements
  WHERE type = p_type AND user_id = p_user_id;
  
  RETURN prefix || LPAD(next_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC PARA CREAR MOVIMIENTO DE COMPRA
CREATE OR REPLACE FUNCTION create_purchase_movement(
  p_provider_id UUID,
  p_ingredient_id UUID,
  p_quantity NUMERIC,
  p_cost NUMERIC,
  p_date TIMESTAMPTZ,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_doc_number TEXT;
  v_movement_id UUID;
  v_ingredient_name TEXT;
BEGIN
  v_user_id := auth.uid();
  v_doc_number := get_next_document_number('COMPRA', v_user_id);
  
  SELECT name INTO v_ingredient_name FROM ingredients WHERE id = p_ingredient_id;
  
  INSERT INTO movements (
    user_id, type, document_number, date, provider_id, 
    total, notes, status
  ) VALUES (
    v_user_id, 'COMPRA', v_doc_number, p_date, p_provider_id,
    p_cost, p_notes, 'CONFIRMADO'
  ) RETURNING id INTO v_movement_id;
  
  INSERT INTO movement_lines (
    movement_id, ingredient_id, description, quantity, unit_cost, line_total
  ) VALUES (
    v_movement_id, p_ingredient_id, v_ingredient_name, p_quantity, 
    CASE WHEN p_quantity > 0 THEN p_cost / p_quantity ELSE 0 END,
    p_cost
  );
  
  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC PARA CREAR MOVIMIENTO DE GASTO
CREATE OR REPLACE FUNCTION create_expense_movement(
  p_service_id UUID,
  p_category_id UUID,
  p_amount NUMERIC,
  p_date TIMESTAMPTZ,
  p_notes TEXT DEFAULT NULL,
  p_expense_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_doc_number TEXT;
  v_movement_id UUID;
  v_category_name TEXT;
BEGIN
  v_user_id := auth.uid();
  v_doc_number := get_next_document_number('GASTO', v_user_id);
  
  SELECT name INTO v_category_name FROM expense_categories WHERE id = p_category_id;
  
  INSERT INTO movements (
    user_id, type, document_number, date, service_id, 
    total, notes, status, expense_id
  ) VALUES (
    v_user_id, 'GASTO', v_doc_number, p_date, p_service_id,
    p_amount, p_notes, 'CONFIRMADO', p_expense_id
  ) RETURNING id INTO v_movement_id;
  
  INSERT INTO movement_lines (
    movement_id, expense_category_id, description, quantity, unit_cost, line_total
  ) VALUES (
    v_movement_id, p_category_id, v_category_name, 1, p_amount, p_amount
  );
  
  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC PARA CREAR MOVIMIENTO DE VENTA
CREATE OR REPLACE FUNCTION create_sale_movement(
  p_customer_id UUID,
  p_items JSONB,
  p_total NUMERIC,
  p_date TIMESTAMPTZ,
  p_notes TEXT DEFAULT NULL,
  p_sale_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_doc_number TEXT;
  v_movement_id UUID;
  item JSONB;
  v_dish_name TEXT;
BEGIN
  v_user_id := auth.uid();
  v_doc_number := get_next_document_number('VENTA', v_user_id);
  
  INSERT INTO movements (
    user_id, type, document_number, date, customer_id, 
    total, notes, status, sale_id
  ) VALUES (
    v_user_id, 'VENTA', v_doc_number, p_date, p_customer_id,
    p_total, p_notes, 'CONFIRMADO', p_sale_id
  ) RETURNING id INTO v_movement_id;
  
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT name INTO v_dish_name FROM dishes WHERE id = (item->>'dish_id')::UUID;
    
    INSERT INTO movement_lines (
      movement_id, dish_id, description, quantity, unit_price, line_total
    ) VALUES (
      v_movement_id, 
      (item->>'dish_id')::UUID, 
      v_dish_name,
      (item->>'quantity')::NUMERIC, 
      (item->>'price')::NUMERIC,
      (item->>'quantity')::NUMERIC * (item->>'price')::NUMERIC
    );
  END LOOP;
  
  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC PARA ANULAR MOVIMIENTO
CREATE OR REPLACE FUNCTION void_movement(p_movement_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE movements 
  SET status = 'ANULADO', updated_at = now()
  WHERE id = p_movement_id AND status != 'ANULADO';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

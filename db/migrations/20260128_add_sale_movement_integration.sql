-- ==========================================
-- Migration: add_sale_movement_integration
-- Description: Integrates sales with movements
-- ==========================================

-- 1. Create unique partial index on sale_id for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_movements_sale_id_unique 
ON movements(sale_id) 
WHERE sale_id IS NOT NULL;

-- 2. Drop old register_sale functions to replace with new integrated version
DROP FUNCTION IF EXISTS register_sale(numeric, text, jsonb, text, text, numeric, numeric, text);
DROP FUNCTION IF EXISTS register_sale(uuid, numeric, text, jsonb, numeric, numeric, text, uuid);

-- 3. Create new unified register_sale with movement integration
CREATE OR REPLACE FUNCTION register_sale(
  p_sale_total NUMERIC,
  p_payment_method TEXT,
  p_items JSONB,
  p_customer_id UUID DEFAULT NULL,
  p_delivery_fee NUMERIC DEFAULT 0,
  p_extras_amount NUMERIC DEFAULT 0,
  p_extras_details TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_sale_id UUID;
  item JSONB;
  ing_rec RECORD;
  needed_qty NUMERIC;
  pm_id UUID;
  sale_cost NUMERIC := 0;
  dish_total_cost NUMERIC;
  v_customer_name TEXT;
  v_doc_number TEXT;
  v_movement_id UUID;
  v_dish_name TEXT;
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  -- Resolve Payment Method ID
  SELECT id INTO pm_id FROM payment_methods WHERE lower(name) = lower(p_payment_method) LIMIT 1;
  IF pm_id IS NULL THEN
    SELECT id INTO pm_id FROM payment_methods WHERE active = true LIMIT 1;
  END IF;

  -- Get customer name if customer_id provided
  IF p_customer_id IS NOT NULL THEN
    SELECT name INTO v_customer_name FROM customers WHERE id = p_customer_id;
  ELSE
    v_customer_name := 'Cliente Mostrador';
  END IF;

  -- 1. Create Sale
  INSERT INTO sales (
    total, 
    payment_method, 
    customer_id,
    delivery_fee, 
    extras_amount, 
    extras_details,
    user_id
  )
  VALUES (
    p_sale_total, 
    p_payment_method,
    p_customer_id,
    p_delivery_fee, 
    p_extras_amount, 
    p_extras_details,
    v_user_id
  )
  RETURNING id INTO new_sale_id;

  -- 2. Process Items (deduct inventory)
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Use 'price' column (not 'unit_price')
    INSERT INTO sale_items (sale_id, dish_id, quantity, price)
    VALUES (new_sale_id, (item->>'dish_id')::UUID, (item->>'quantity')::INTEGER, (item->>'price')::NUMERIC);

    FOR ing_rec IN 
      SELECT di.ingredient_id, di.used_quantity
      FROM dish_ingredients di
      WHERE di.dish_id = (item->>'dish_id')::UUID
    LOOP
      needed_qty := ing_rec.used_quantity * (item->>'quantity')::NUMERIC;
      
      UPDATE ingredients
      SET purchase_quantity = purchase_quantity - needed_qty
      WHERE id = ing_rec.ingredient_id;

      INSERT INTO inventory_movements (ingredient_id, type, quantity, date, description)
      VALUES (ing_rec.ingredient_id, 'VENTA', -needed_qty, now(), 'Venta #' || substring(new_sale_id::text, 1, 8));
    END LOOP;
    
    SELECT total_cost INTO dish_total_cost FROM dishes WHERE id = (item->>'dish_id')::UUID;
    sale_cost := sale_cost + (COALESCE(dish_total_cost, 0) * (item->>'quantity')::NUMERIC);
  END LOOP;

  -- 3. Create Movement for accounting (positive income)
  v_doc_number := get_next_document_number('VENTA', v_user_id);
  
  INSERT INTO movements (
    user_id, type, document_number, date, customer_id, 
    total, notes, status, sale_id
  ) VALUES (
    v_user_id, 
    'VENTA', 
    v_doc_number, 
    now(), 
    p_customer_id,
    p_sale_total, 
    CASE WHEN p_extras_details IS NOT NULL AND p_extras_details != '' 
         THEN 'Extras: ' || p_extras_details ELSE NULL END, 
    'COMPLETADO', 
    new_sale_id
  ) RETURNING id INTO v_movement_id;

  -- 4. Create Movement Lines
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT name INTO v_dish_name FROM dishes WHERE id = (item->>'dish_id')::UUID;
    
    INSERT INTO movement_lines (movement_id, dish_id, description, quantity, unit_price, line_total)
    VALUES (
      v_movement_id, 
      (item->>'dish_id')::UUID, 
      v_dish_name,
      (item->>'quantity')::NUMERIC, 
      (item->>'price')::NUMERIC,
      (item->>'quantity')::NUMERIC * (item->>'price')::NUMERIC
    );
  END LOOP;

  RETURN new_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION register_sale TO authenticated;

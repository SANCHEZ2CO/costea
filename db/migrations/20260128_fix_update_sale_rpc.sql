-- Migration: fix_update_sale_rpc
-- Description: Fixes update_sale RPC to match current schema

CREATE OR REPLACE FUNCTION update_sale(
  p_sale_id UUID,
  p_customer_name TEXT,
  p_customer_id UUID,
  p_payment_method TEXT,
  p_items JSONB, -- If null, we don't update items
  p_status TEXT -- 'CONFIRMADO', 'ANULADO', etc.
) RETURNS BOOLEAN AS $$
DECLARE
  v_old_status TEXT;
  v_old_items RECORD;
  v_item JSONB;
  v_dish_id UUID;
  v_qty NUMERIC;
  v_needed_qty NUMERIC;
  v_pm_id UUID; 
  v_new_total NUMERIC := 0;
  v_dish_price NUMERIC;
  v_movement_id UUID;
BEGIN
  -- 1. Get current status
  SELECT status INTO v_old_status FROM movements WHERE sale_id = p_sale_id;
  
  -- Prevent editing if already ANULADO
  IF v_old_status = 'ANULADO' THEN
     RAISE EXCEPTION 'No se puede editar una venta anulada.';
  END IF;

  -- 2. Handle Status Change to ANULADO
  IF p_status = 'ANULADO' THEN
     -- Revert Inventory for ALL existing items
     FOR v_old_items IN SELECT * FROM sale_items WHERE sale_id = p_sale_id
     LOOP
         -- For each ingredient in this dish, add back to stock
         FOR v_item IN 
            SELECT ingredient_id, used_quantity 
            FROM dish_ingredients 
            WHERE dish_id = v_old_items.dish_id
         LOOP
            UPDATE ingredients
            SET purchase_quantity = purchase_quantity + (v_item.used_quantity * v_old_items.quantity)
            WHERE id = (v_item.ingredient_id)::UUID;

            -- Log inventory movement for reversal
            INSERT INTO inventory_movements (ingredient_id, type, quantity, date, description)
            VALUES (v_item.ingredient_id, 'AJUSTE', (v_item.used_quantity * v_old_items.quantity), now(), 'Anulación Venta #' || substring(p_sale_id::text, 1, 8));
         END LOOP;
     END LOOP;

     -- Update Movement Status
     UPDATE movements SET status = 'ANULADO', updated_at = NOW() WHERE sale_id = p_sale_id;
     
     RETURN TRUE;
  END IF;

  -- 3. Handle Normal Update (Content Edit)
  
  -- Validate Payment Method exists (optional check)
  SELECT id INTO v_pm_id FROM payment_methods WHERE lower(name) = lower(p_payment_method) LIMIT 1;

  -- If p_items provided, we do a full Revert-and-Replace
  IF p_items IS NOT NULL THEN
      -- A. Revert Old Inventory
      FOR v_old_items IN SELECT * FROM sale_items WHERE sale_id = p_sale_id
      LOOP
         FOR v_item IN 
            SELECT ingredient_id, used_quantity 
            FROM dish_ingredients 
            WHERE dish_id = v_old_items.dish_id
         LOOP
            UPDATE ingredients
            SET purchase_quantity = purchase_quantity + (v_item.used_quantity * v_old_items.quantity)
            WHERE id = (v_item.ingredient_id)::UUID;
         END LOOP;
      END LOOP;

      -- B. Delete Old Items
      DELETE FROM sale_items WHERE sale_id = p_sale_id;

      -- C. Insert New Items & Deduct Inventory
      FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
      LOOP
          v_dish_id := (v_item->>'dish_id')::UUID;
          v_qty := (v_item->>'quantity')::NUMERIC;
          v_dish_price := (v_item->>'price')::NUMERIC;
          
          v_new_total := v_new_total + (v_qty * v_dish_price);

          -- Fix: use 'price' not 'unit_price'
          INSERT INTO sale_items (sale_id, dish_id, quantity, price)
          VALUES (p_sale_id, v_dish_id, v_qty, v_dish_price);

          -- Deduct Inventory
          FOR v_old_items IN 
            SELECT ingredient_id, used_quantity 
            FROM dish_ingredients 
            WHERE dish_id = v_dish_id
          LOOP
            UPDATE ingredients
            SET purchase_quantity = purchase_quantity - (v_old_items.used_quantity * v_qty)
            WHERE id = (v_old_items.ingredient_id)::UUID;
            
            -- Log inventory movement
            INSERT INTO inventory_movements (ingredient_id, type, quantity, date, description)
            VALUES (v_old_items.ingredient_id, 'VENTA', -(v_old_items.used_quantity * v_qty), now(), 'Modificación Venta #' || substring(p_sale_id::text, 1, 8));

          END LOOP;
      END LOOP;
      
      -- Update Sale Total and Customer
      UPDATE sales 
      SET total = v_new_total + COALESCE(delivery_fee, 0) + COALESCE(extras_amount, 0),
          customer_id = p_customer_id,
          payment_method = p_payment_method
      WHERE id = p_sale_id;

      -- Update Movement Total
      UPDATE movements
      SET total = v_new_total + COALESCE((SELECT delivery_fee FROM sales WHERE id = p_sale_id), 0) + COALESCE((SELECT extras_amount FROM sales WHERE id = p_sale_id), 0),
          customer_id = p_customer_id,
          updated_at = NOW()
      WHERE sale_id = p_sale_id;

  ELSE
      -- Just update metadata if no info on items
      UPDATE sales 
      SET customer_id = p_customer_id,
          payment_method = p_payment_method
      WHERE id = p_sale_id;

      UPDATE movements
      SET customer_id = p_customer_id,
          updated_at = NOW()
      WHERE sale_id = p_sale_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FIX RLS POLICIES: customers y stamp_requests
-- Reemplaza WITH CHECK (true) por políticas con verificación
-- de pertenencia al negocio.
-- Ejecutar en SQL Editor de Supabase
-- ============================================================

-- ============================================================
-- 1. CUSTOMERS — Corregir INSERT y UPDATE
-- ============================================================

-- Eliminar políticas existentes demasiado permisivas
DROP POLICY IF EXISTS "Cliente se registra" ON customers;
DROP POLICY IF EXISTS "Cliente se actualiza" ON customers;

-- INSERT: solo usuarios autenticados dueños del negocio.
-- La PWA usa register_customer() RPC (SECURITY DEFINER), no este path.
DROP POLICY IF EXISTS "Dueño registra cliente" ON customers;
CREATE POLICY "Dueño registra cliente" ON customers
  FOR INSERT
  WITH CHECK (is_business_owner(business_id::text));

-- UPDATE: solo dueño del negocio puede modificar sus clientes
DROP POLICY IF EXISTS "Dueño actualiza cliente" ON customers;
CREATE POLICY "Dueño actualiza cliente" ON customers
  FOR UPDATE
  USING (is_business_owner(business_id::text))
  WITH CHECK (is_business_owner(business_id::text));


-- ============================================================
-- 2. STAMP_REQUESTS — Corregir INSERT
-- ============================================================

-- Eliminar política existente demasiado permisiva
DROP POLICY IF EXISTS "Cliente crea solicitud" ON stamp_requests;

-- INSERT: solo usuarios autenticados dueños del negocio.
-- La PWA ahora usará create_stamp_request() RPC (SECURITY DEFINER).
DROP POLICY IF EXISTS "Dueño crea solicitud" ON stamp_requests;
CREATE POLICY "Dueño crea solicitud" ON stamp_requests
  FOR INSERT
  WITH CHECK (is_business_owner(business_id::text));


-- ============================================================
-- 3. NUEVA RPC: create_stamp_request (SECURITY DEFINER)
--    Permite que la PWA (sin auth) siga creando solicitudes
--    sin bypassear RLS con WITH CHECK (true).
-- ============================================================

CREATE OR REPLACE FUNCTION create_stamp_request(
  p_customer_id text,
  p_business_id text,
  p_program_id text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  new_request record;
  existing record;
  recent record;
BEGIN
  -- Validar que el negocio existe
  IF NOT EXISTS (SELECT 1 FROM businesses WHERE id = p_business_id) THEN
    RETURN json_build_object('error', 'Negocio no encontrado');
  END IF;

  -- Validar que el cliente pertenece a ese negocio
  IF NOT EXISTS (SELECT 1 FROM customers WHERE id = p_customer_id AND business_id = p_business_id) THEN
    RETURN json_build_object('error', 'Cliente no pertenece a este negocio');
  END IF;

  -- Cooldown: verificar si hay una solicitud reciente (últimos 5 minutos)
  SELECT * INTO recent
  FROM stamp_requests
  WHERE customer_id = p_customer_id
    AND business_id = p_business_id
    AND created_at > now() - interval '5 minutes'
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object('id', null, 'status', 'cooldown');
  END IF;

  -- Evitar duplicados: no permitir dos solicitudes pending del mismo cliente al mismo negocio
  SELECT * INTO existing
  FROM stamp_requests
  WHERE customer_id = p_customer_id
    AND business_id = p_business_id
    AND status = 'pending'
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object('error', 'Ya existe una solicitud pendiente para este cliente', 'duplicate', true);
  END IF;

  INSERT INTO stamp_requests (customer_id, business_id, program_id, status, created_at)
  VALUES (p_customer_id, p_business_id, p_program_id, 'pending', now())
  RETURNING * INTO new_request;

  RETURN json_build_object(
    'id', new_request.id,
    'status', new_request.status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

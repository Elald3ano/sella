-- ============================================================
-- SELLA: Migración completa a Supabase-only
-- Ejecutar en SQL Editor de Supabase
-- ============================================================

-- 1. SCHEMA CHANGES
-- ============================================================

-- Agregar user_id para relacionar negocio con auth.users
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE businesses SET user_id = (SELECT id FROM auth.users WHERE email = 'danico8822@gmail.com' LIMIT 1) WHERE user_id IS NULL;

-- Eliminar columna pin (ya no se usa)
ALTER TABLE businesses DROP COLUMN IF EXISTS pin;

-- Agregar email a businesses (se guarda del auth)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS email text;

-- ============================================================
-- 2. RLS POLICIES
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamp_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Función helper: es admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN coalesce((auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función helper: es dueño del negocio?
CREATE OR REPLACE FUNCTION is_business_owner(business_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM businesses
    WHERE id = business_id::uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- businesses: admin ve todos, dueño solo su negocio
CREATE POLICY "Admin ve todos los negocios" ON businesses FOR SELECT USING (is_admin());
CREATE POLICY "Dueño ve su negocio" ON businesses FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Dueño actualiza su negocio" ON businesses FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Registro público" ON businesses FOR INSERT WITH CHECK (true);

-- programs: admin ve todos, dueño los suyos
CREATE POLICY "Admin ve todos los programas" ON programs FOR SELECT USING (is_admin());
CREATE POLICY "Dueño ve sus programas" ON programs FOR SELECT USING (is_business_owner(business_id::text));
CREATE POLICY "Dueño crea programas" ON programs FOR INSERT WITH CHECK (is_business_owner(business_id::text));
CREATE POLICY "Dueño actualiza programas" ON programs FOR UPDATE USING (is_business_owner(business_id::text));

-- customers: admin ve todos, dueño los suyos
CREATE POLICY "Admin ve todos los clientes" ON customers FOR SELECT USING (is_admin());
CREATE POLICY "Dueño ve sus clientes" ON customers FOR SELECT USING (is_business_owner(business_id::text));
CREATE POLICY "Cliente se registra" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Cliente se actualiza" ON customers FOR UPDATE USING (true);

-- stamps: admin ve todos, dueño los suyos
CREATE POLICY "Admin ve todos los sellos" ON stamps FOR SELECT USING (is_admin());
CREATE POLICY "Dueño ve sus sellos" ON stamps FOR SELECT USING (is_business_owner(business_id::text));
CREATE POLICY "Crear sello" ON stamps FOR INSERT WITH CHECK (is_business_owner(business_id::text));

-- stamp_requests
CREATE POLICY "Admin ve todas las solicitudes" ON stamp_requests FOR SELECT USING (is_admin());
CREATE POLICY "Dueño ve sus solicitudes" ON stamp_requests FOR SELECT USING (is_business_owner(business_id::text));
CREATE POLICY "Cliente crea solicitud" ON stamp_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Dueño actualiza solicitud" ON stamp_requests FOR UPDATE USING (is_business_owner(business_id::text));

-- redemptions
CREATE POLICY "Admin ve todos los canjes" ON redemptions FOR SELECT USING (is_admin());
CREATE POLICY "Dueño ve sus canjes" ON redemptions FOR SELECT USING (is_business_owner(program.business_id::text));
CREATE POLICY "Dueño crea canje" ON redemptions FOR INSERT WITH CHECK (is_business_owner(program.business_id::text));

-- subscriptions
CREATE POLICY "Admin ve todas las subscripciones" ON subscriptions FOR SELECT USING (is_admin());
CREATE POLICY "Dueño ve su subscripción" ON subscriptions FOR SELECT USING (is_business_owner(business_id::text));

-- admin_users
CREATE POLICY "Solo admin ve admin_users" ON admin_users FOR SELECT USING (is_admin());

-- ============================================================
-- 3. TRIGGERS
-- ============================================================

-- Trigger: al crear negocio, crear subscription trial 30 días
CREATE OR REPLACE FUNCTION create_subscription_on_business()
RETURNS trigger AS $$
BEGIN
  INSERT INTO subscriptions (business_id, plan, status, trial_ends_at, started_at, created_at)
  VALUES (NEW.id, 'trial', 'active', now() + interval '30 days', now(), now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_business_subscription ON businesses;
CREATE TRIGGER trigger_business_subscription
  AFTER INSERT ON businesses
  FOR EACH ROW EXECUTE FUNCTION create_subscription_on_business();

-- Trigger: al crear sello, actualizar lastVisit del cliente
CREATE OR REPLACE FUNCTION update_last_visit()
RETURNS trigger AS $$
BEGIN
  UPDATE customers SET last_visit = now() WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_stamp_last_visit ON stamps;
CREATE TRIGGER trigger_stamp_last_visit
  AFTER INSERT ON stamps
  FOR EACH ROW EXECUTE FUNCTION update_last_visit();

-- Trigger: normalizar teléfono al guardar cliente
CREATE OR REPLACE FUNCTION normalize_customer_phone()
RETURNS trigger AS $$
BEGIN
  NEW.phone = regexp_replace(NEW.phone, '\D', '', 'g');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_normalize_phone ON customers;
CREATE TRIGGER trigger_normalize_phone
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION normalize_customer_phone();

-- ============================================================
-- 4. FUNCIONES DE NEGOCIO
-- ============================================================

-- Función: aprobar solicitud de sello
CREATE OR REPLACE FUNCTION approve_stamp_request(request_id uuid)
RETURNS json AS $$
DECLARE
  req record;
  prog record;
  new_stamp record;
  stamp_count int;
  cust_name text;
BEGIN
  SELECT * INTO req FROM stamp_requests WHERE id = request_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Solicitud no encontrada o ya procesada');
  END IF;

  SELECT * INTO prog FROM programs WHERE business_id = req.business_id AND active = true
    ORDER BY (CASE WHEN id = req.program_id THEN 0 ELSE 1 END), created_at ASC LIMIT 1;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'El negocio no tiene programas activos');
  END IF;

  INSERT INTO stamps (customer_id, business_id, program_id, created_at)
  VALUES (req.customer_id, req.business_id, prog.id, now())
  RETURNING * INTO new_stamp;

  UPDATE stamp_requests SET status = 'approved' WHERE id = request_id;

  SELECT count(*) INTO stamp_count FROM stamps WHERE customer_id = req.customer_id AND program_id = prog.id;
  SELECT name INTO cust_name FROM customers WHERE id = req.customer_id;

  RETURN json_build_object(
    'stamp', json_build_object('id', new_stamp.id, 'programId', prog.id),
    'stampCount', stamp_count,
    'target', prog.target,
    'reward', prog.reward,
    'completed', stamp_count >= prog.target,
    'customerName', cust_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: canjear premio
CREATE OR REPLACE FUNCTION redeem(customer_id uuid, program_id uuid)
RETURNS json AS $$
DECLARE
  prog record;
  stamp_count int;
  stamps_to_delete uuid[];
BEGIN
  SELECT * INTO prog FROM programs WHERE id = program_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Programa no encontrado');
  END IF;

  SELECT count(*) INTO stamp_count FROM stamps WHERE customer_id = redeem.customer_id AND program_id = redeem.program_id;

  IF stamp_count < prog.target THEN
    RETURN json_build_object(
      'error', 'Cliente no ha alcanzado la meta',
      'stamps', stamp_count,
      'target', prog.target,
      'remaining', prog.target - stamp_count
    );
  END IF;

  SELECT array_agg(id) INTO stamps_to_delete FROM (
    SELECT id FROM stamps WHERE customer_id = redeem.customer_id AND program_id = redeem.program_id
    ORDER BY created_at ASC LIMIT prog.target
  ) sub;

  DELETE FROM stamps WHERE id = ANY(stamps_to_delete);

  INSERT INTO redemptions (customer_id, program_id, redeemed_at)
  VALUES (redeem.customer_id, redeem.program_id, now());

  RETURN json_build_object('success', true, 'reward', prog.reward, 'stampsUsed', prog.target);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: historial del cliente con alertas
CREATE OR REPLACE FUNCTION customer_history(cust_id uuid)
RETURNS json AS $$
DECLARE
  cust record;
  biz record;
  stamps_json json;
  redemptions_json json;
  stats_json json;
  alerts_json json;
  total_stamps int;
  total_redemptions int;
  avg_days float;
  first_visit timestamptz;
  last_visit timestamptz;
BEGIN
  SELECT * INTO cust FROM customers WHERE id = cust_id;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Cliente no encontrado');
  END IF;

  SELECT * INTO biz FROM businesses WHERE id = cust.business_id;

  SELECT json_agg(s ORDER BY s.created_at DESC) INTO stamps_json FROM (
    SELECT s.id, s.created_at, json_build_object('id', p.id, 'title', p.title) AS program
    FROM stamps s JOIN programs p ON p.id = s.program_id
    WHERE s.customer_id = cust_id
  ) s;

  SELECT json_agg(r ORDER BY r.redeemed_at DESC) INTO redemptions_json FROM (
    SELECT r.id, r.redeemed_at, json_build_object('title', p.title, 'reward', p.reward) AS program
    FROM redemptions r JOIN programs p ON p.id = r.program_id
    WHERE r.customer_id = cust_id
  ) r;

  SELECT count(*) INTO total_stamps FROM stamps WHERE customer_id = cust_id;
  SELECT count(*) INTO total_redemptions FROM redemptions WHERE customer_id = cust_id;

  SELECT min(created_at), max(created_at) INTO first_visit, last_visit FROM stamps WHERE customer_id = cust_id;

  SELECT CASE WHEN count(*) >= 2
    THEN round((extract(epoch FROM max(created_at) - min(created_at)) / 86400.0 / (count(*) - 1))::numeric, 1)
    ELSE 0 END INTO avg_days
  FROM stamps WHERE customer_id = cust_id;

  stats_json := json_build_object(
    'totalStamps', total_stamps,
    'totalRedemptions', total_redemptions,
    'avgDaysBetweenVisits', avg_days,
    'firstVisit', first_visit,
    'lastVisit', last_visit
  );

  -- Alertas: 2+ sellos mismo día
  SELECT json_agg(a) INTO alerts_json FROM (
    SELECT
      to_char(created_at::date, 'YYYY-MM-DD') AS date,
      count(*) AS count,
      CASE WHEN count(*) >= 4 THEN 'danger' ELSE 'warning' END AS level,
      CASE WHEN count(*) >= 4 THEN count(*) || ' sellos el mismo día — revisar'
           ELSE count(*) || ' visitas el mismo día' END AS msg
    FROM stamps WHERE customer_id = cust_id
    GROUP BY created_at::date
    HAVING count(*) >= 2
    ORDER BY created_at::date DESC
  ) a;

  RETURN json_build_object(
    'customer', json_build_object(
      'id', cust.id, 'name', cust.name, 'phone', cust.phone,
      'createdAt', cust.created_at, 'lastVisit', cust.last_visit, 'notes', cust.notes,
      'business', json_build_object('id', biz.id, 'name', biz.name)
    ),
    'stamps', coalesce(stamps_json, '[]'::json),
    'redemptions', coalesce(redemptions_json, '[]'::json),
    'stats', stats_json,
    'alerts', coalesce(alerts_json, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: registrar negocio (sin pin)
CREATE OR REPLACE FUNCTION register_business(p_name text, p_phone text, p_type text, p_email text)
RETURNS json AS $$
DECLARE
  new_business record;
BEGIN
  INSERT INTO businesses (name, phone, type, email, user_id, plan, created_at, updated_at)
  VALUES (p_name, p_phone, p_type, p_email, auth.uid(), 'trial', now(), now())
  RETURNING * INTO new_business;

  RETURN json_build_object(
    'id', new_business.id,
    'name', new_business.name,
    'phone', new_business.phone,
    'type', new_business.type,
    'plan', new_business.plan
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

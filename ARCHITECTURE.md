# ARCHITECTURE.md — Sella

## 1. Resumen del Proyecto

Plataforma SaaS de fidelización digital para comercios locales (Cali, Colombia). Reemplaza tarjetas de sellos físicas por un QR. El comercio configura programas de recompensa ("compra 10, llévate 1"), sus clientes acumulan sellos escaneando un QR, y el sistema detecta clientes inactivos y patrones de fraude. Monetiza por suscripción mensual con tier gratuito, basic ($25K COP) y pro ($45K COP).

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| **Frontend Web** | React + Vite | 18.3 / 5.2 | Panel de comercios y admin |
| **Frontend PWA** | React + Vite + vite-plugin-pwa | 18.3 / 5.2 / 0.20 | App de clientes (escaneo QR) |
| **Estilos** | Tailwind CSS + PostCSS + Autoprefixer | 3.4 / 8.4 / 10.4 | CSS utility-first |
| **Ruteo** | react-router-dom | 6.23 | SPA routing |
| **Auth** | Supabase Auth (email/password) | `@supabase/supabase-js` 2.105 | Login de comercios + admin |
| **Base de datos** | Supabase (PostgreSQL 15) | — | Almacenamiento transaccional |
| **API de datos** | PostgREST (via Supabase SDK) + RPC | — | CRUD directo + lógica de negocio |
| **Funciones DB** | PL/pgSQL (PostgreSQL) | — | Transacciones, validaciones, alertas |
| **QR** | qrcode (npm) | 1.5 | Generación client-side |
| **Despliegue Web** | Vercel | — | Hosting estático + serverless |
| **Despliegue PWA** | Vercel | — | Hosting estático + service worker |
| **Monorepo** | npm workspaces | — | Organización de paquetes |
| **TypeScript** | — | 5.4 | Tipado estático |

---

## 3. Estructura de Datos (Supabase)

### 3.1 Tablas Principales

| Tabla | Mapa | Registro |
|-------|------|----------|
| `businesses` | Negocios registrados | `id`, `name`, `phone`, `type`, `plan` (trial/free/basic/pro), `user_id` (FK → auth.users), `email`, `address`, `owner_name` |
| `programs` | Programas de fidelización | `id`, `title`, `target` (sellos para premio), `reward`, `business_id` (FK) |
| `customers` | Clientes finales | `id`, `name`, `phone`, `notes`, `business_id` (FK), `last_visit` |
| `stamps` | Sellos otorgados | `id`, `customer_id` (FK), `business_id` (FK), `program_id` (FK), `created_at` |
| `stamp_requests` | Solicitudes pendientes | `id`, `customer_id` (FK), `business_id` (FK), `program_id` (FK, nullable), `status` (pending/approved/rejected) |
| `redemptions` | Canjes de premios | `id`, `customer_id` (FK), `program_id` (FK), `redeemed_at` |
| `subscriptions` | Planes contratados | `id`, `business_id` (FK, unique), `plan`, `status`, `trial_ends_at`, `started_at` |
| `admin_users` | Administradores (legado) | `id`, `username`, `password_hash` |

### 3.2 Relaciones Clave

```
Business ──1:N── Program
Business ──1:N── Customer
Business ──1:N── Stamp
Business ──1:1── Subscription
Customer ──1:N── Stamp
Customer ──1:N── StampRequest
Customer ──1:N── Redemption
Program  ──1:N── Stamp
Program  ──1:N── Redemption
Customer.phone + Customer.business_id = UNIQUE
```

### 3.3 Políticas RLS

Todas las tablas tienen RLS habilitado. Dos funciones helper (`is_admin()`, `is_business_owner(business_id text)`) gobiernan el acceso:

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `businesses` | Admin o dueño | Público (registro) | Dueño | — |
| `programs` | Público | Dueño (`is_business_owner`) | Dueño (`is_business_owner`) | — |
| `customers` | Admin o dueño | Dueño (`is_business_owner`) | Dueño (`is_business_owner`, USING + WITH CHECK) | — |
| `stamps` | Admin o dueño | Dueño (`is_business_owner`) | — | — |
| `stamp_requests` | Admin o dueño | Dueño (`is_business_owner`) | Dueño (`is_business_owner`) | — |
| `redemptions` | Admin o dueño | Dueño (vía subquery a `programs`) | — | — |
| `subscriptions` | Admin o dueño | — | — | — |

- La tabla `redemptions` verifica pertenencia del `business_id` vía subquery a `programs`.
- Sin políticas DELETE: las eliminaciones se manejan exclusivamente por funciones `SECURITY DEFINER` (`redeem` para sellos, sin cobertura para el resto).
- `stamp_requests` INSERT exige autenticación (`is_business_owner`). La PWA (sin auth) crea solicitudes vía la función RPC `create_stamp_request` (`SECURITY DEFINER`), que incluye validaciones de existencia del negocio, pertenencia del cliente y prevención de duplicados.
- `customers` INSERT está restringido a dueños autenticados. La PWA registra clientes vía el RPC `register_customer` (`SECURITY DEFINER`).

### 3.4 Funciones PL/pgSQL (RPC)

| Función | Parámetros | Retorno | Propósito |
|---------|-----------|---------|-----------|
| `register_business` | `name, phone, type, email` | `{ id, name, phone, type, plan }` | Registro con creación automática de subscription trial |
| `register_customer` | `name, phone, business_id` | `{ id, name, phone, returning }` | Registro/actualización de cliente (normaliza teléfono) |
| `create_stamp_request` | `p_customer_id, p_business_id, p_program_id` | `{ id, status }` | Crea solicitud de sello desde la PWA (valida negocio, cliente, duplicados) |
| `approve_stamp_request` | `request_id` | `{ stampCount, target, reward, completed, customerName }` | Aprueba solicitud, crea stamp, actualiza lastVisit |
| `redeem` | `customer_id, program_id` | `{ success, reward, stampsUsed }` | Canjea premio: borra N sellos, crea redemption |
| `customer_history` | `cust_id` | `{ customer, stamps[], redemptions[], stats, alerts[] }` | Historial completo con detección de patrones |

### 3.5 Triggers

| Trigger | Evento | Acción |
|---------|--------|--------|
| `trigger_business_subscription` | AFTER INSERT ON businesses | Crea subscription trial 30 días |
| `trigger_stamp_last_visit` | AFTER INSERT ON stamps | Actualiza `customers.last_visit` |
| `trigger_normalize_phone` | BEFORE INSERT/UPDATE ON customers | Limpia caracteres no numéricos del teléfono |

### 3.6 Defaults

Todas las columnas `id` tienen `DEFAULT gen_random_uuid()::text`. La extensión `pgcrypto` está activada.

---

## 4. Integraciones y APIs

### 4.1 Supabase SDK

El cliente de Supabase se instancia una única vez en `packages/shared/src/supabase.ts` y es consumido por ambos frontends (`web`, `pwa`) vía `import { supabase } from '@sella/shared/supabase'`. Las credenciales (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) se leen de variables de entorno en cada paquete. Toda la comunicación con la DB pasa por:

- **PostgREST** → `supabase.from('tabla').select/insert/update()`
- **RPC** → `supabase.rpc('funcion', { params })`
- **Auth** → `supabase.auth.signUp/signIn/signOut/getSession/onAuthStateChange`

### 4.2 Supabase Auth

Mecanismo de autenticación: email + contraseña. Provider `email` habilitado, sin confirmación de correo (MVP). Roles:

- **Comercio:** usuario estándar. `user_id` en `businesses` vincula la cuenta.
- **Admin:** usuario con `user_metadata.role = "admin"`. Detectado por RLS vía `is_admin()` y por el frontend vía `AuthProvider.isAdmin`.

La autenticación en el frontend web se centraliza en `AuthProvider.tsx` (React Context). Expone `{ session, user, loading, isAdmin, signOut }` a toda la aplicación. `Layout.tsx` y `AdminLayout.tsx` consumen este contexto en lugar de implementar `getSession`/`onAuthStateChange` por separado.

### 4.3 WhatsApp (Mock)

La integración real con WhatsApp Business Cloud API no está implementada. La página `Campaigns.tsx` en el frontend web genera enlaces `wa.me/` con mensajes pre-llenados. No existe backend de mensajería.

### 4.4 Pagos (No implementado)

Sin pasarela de pago. La monetización es manual vía WhatsApp/email. `PaymentBanner` redirige a `wa.me/` y `mailto:` con mensajes pre-llenados usando `VITE_SUPPORT_PHONE` y `VITE_SUPPORT_EMAIL`.

### 4.5 QR

Generado client-side con `qrcode` (npm). El componente `QrCode.tsx` codifica `http://localhost:5174/s/{businessId}`. En producción debería usar el dominio real de la PWA.

---

## 5. Arquitectura y Estructura de Carpetas

```
sella/
├── package.json              ← monorepo root (npm workspaces)
├── tsconfig.base.json        ← config TypeScript compartida
├── vercel.json               ← deploy config para Vercel (web)
├── supabase-migration.sql    ← migración completa de DB (RLS, triggers, funciones)
├── fix-rls-policies.sql      ← parche de políticas RLS (customers + stamp_requests)
│
├── packages/
│   ├── shared/               ← Código compartido entre web y pwa
│   │   ├── package.json      ← @sella/shared, exports: supabase, PhoneInput, index.css
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── supabase.ts           ← Cliente Supabase unificado (usa env vars)
│   │       ├── index.css             ← Directivas Tailwind (@tailwind base/components/utilities)
│   │       ├── PhoneInput.tsx        ← Selector de país + input numérico
│   │       └── vite-env.d.ts         ← Tipos Vite (import.meta.env)
│   │
│   ├── web/                  ← Panel comercios + admin (React SPA)
│   │   ├── src/
│   │   │   ├── components/             ← Componentes reutilizables
│   │   │   │   ├── AuthProvider.tsx    ← Contexto global de auth (session, user, loading, isAdmin, signOut)
│   │   │   │   ├── Layout.tsx          ← Layout protegido (consume AuthProvider + sidebar + PaymentBanner)
│   │   │   │   ├── AdminLayout.tsx     ← Layout admin (tema oscuro, consume AuthProvider)
│   │   │   │   ├── Sidebar.tsx         ← Navegación del panel
│   │   │   │   ├── CustomerDetail.tsx  ← Modal de historial del cliente
│   │   │   │   ├── PaymentBanner.tsx   ← Banner de trial vencido
│   │   │   │   ├── QrCode.tsx          ← Generación de QR client-side
│   │   │   │   └── MetricCard.tsx      ← Tarjeta de métrica (Dashboard)
│   │   │   └── pages/                  ← Páginas (una por ruta)
│   │   │       ├── Landing.tsx         ← Landing pública
│   │   │       ├── Register.tsx        ← Registro (email + datos negocio)
│   │   │       ├── Login.tsx           ← Login (email + contraseña)
│   │   │       ├── Dashboard.tsx       ← Panel principal (métricas + QR + solicitudes)
│   │   │       ├── ProgramSetup.tsx    ← CRUD de programas
│   │   │       ├── Customers.tsx       ← Lista de clientes + acciones
│   │   │       ├── Campaigns.tsx       ← Reactivación (mock WhatsApp)
│   │   │       └── admin/
│   │   │           ├── AdminLogin.tsx  ← Login admin
│   │   │           └── AdminDashboard.tsx ← Panel admin (métricas globales + gestión)
│   │   ├── .env                        ← VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_SUPPORT_PHONE, VITE_SUPPORT_EMAIL
│   │   └── tailwind.config.ts          ← Escanea ./src y ../shared/src
│   │
│   └── pwa/                  ← App clientes (PWA React)
│       ├── src/
│       │   ├── components/
│       │   │   ├── BusinessInfo.tsx     ← Info del negocio en vista de sellos
│       │   │   └── StampCard.tsx        ← Barra de progreso de sellos
│       │   └── pages/
│       │       ├── Home.tsx             ← Escáner QR / entrada manual
│       │       ├── Scan.tsx             ← Registro/login cliente + vista de sellos
│       │       ├── MyStamps.tsx         ← Consolidado multi-negocio
│       │       └── Rewards.tsx          ← Premios (placeholder)
│       ├── .env                        ← VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
│       └── tailwind.config.ts          ← Escanea ./src y ../shared/src
```

---

## 6. Patrones de Código Actuales

### 6.1 Fetching de Datos

No hay un patrón consistente. Conviven al menos 3 enfoques:

1. **Supabase SDK con `useEffect` + `getSession` sin listener** (usado en `Dashboard`, `Customers`, `Campaigns`, `ProgramSetup`). Cada página re-ejecuta `getSession()` y re-consulta el `business_id` desde la DB en vez de recibirlo vía contexto.
2. **Supabase SDK en handlers onClick** (usado para acciones: dar sello, canjear, registrar visita). Sin estados de carga compartidos.
3. **RPC calls** (usado para `approve_stamp_request`, `redeem`, `customer_history`, `register_customer`, `create_stamp_request`). Las funciones `SECURITY DEFINER` manejan la lógica de negocio del lado del servidor.

### 6.2 Autenticación

- **AuthProvider (web):** Contexto React global en `AuthProvider.tsx`. Inicializa secuencialmente: `getSession()` → `await loadBusiness()` → `finally { setLoading(false) }`. Usa `.maybeSingle()` con un reintento de 2000ms si el primer intento no encuentra datos, mitigando la condición de carrera con `Register.tsx` (el `signUp` autologuea antes de que el RPC `register_business` inserte el registro). Solo si el reintento también falla se ejecuta `signOut`. El listener `onAuthStateChange` maneja cambios posteriores sin tocar el estado `loading`. Un flag `cancelled` previene escrituras de estado post-unmount.
- **Layout.tsx y AdminLayout.tsx:** Consumen `useAuth()`. Ya no implementan `getSession`/`onAuthStateChange` inline. `Layout` carga los datos del negocio (`businesses`) cuando el usuario está disponible. `AdminLayout` verifica `isAdmin` desde el contexto.
- **Login/Register:** Usan `supabase.auth.signUp()` y `signInWithPassword()` directamente. Tras el login exitoso, el `AuthProvider` detecta el cambio de sesión automáticamente. `Register.tsx` envuelve toda la lógica de registro (`signUp` + `register_business` RPC) en `try/catch` con `finally` para `setLoading(false)`, y todo error se muestra en la UI sin usar `console.error` aislado.
- **Clientes PWA:** Sin autenticación. Identificados por teléfono + localStorage. Los RPC `register_customer` y `create_stamp_request` son `SECURITY DEFINER`, bypassan RLS.

### 6.3 Convenciones de Nomenclatura

- **DB:** `snake_case` (columnas y tablas). Impuesto por PostgreSQL/Supabase.
- **TypeScript interfaces:** Mixto. Algunas usan `snake_case` para mapear directo de la DB (`last_visit`, `business_id`), otras `camelCase` (`totalCustomers`, `stampsThisMonth`). Se usan casts `as any` para resolver.
- **RLS policies:** Español ("Admin ve todos los negocios").
- **RPC functions:** Inglés (`approve_stamp_request`, `register_customer`). Parámetros inconsistentes: `p_name` (prefijo húngaro) vs `request_id` (sin prefijo) vs `cust_id` (abreviado).
- **UI:** Español (argentino/colombiano: "configurá", "creá", "tenés").

### 6.4 Manejo de Errores

Inconsistente. Conviven al menos 4 patrones:

1. **`try/catch` + `setError` en UI** (usado en `Register.tsx`). Toda la lógica asíncrona envuelta en `try/catch` con `finally` para resetear `loading`. Cada error del SDK se convierte en excepción (`throw new Error(msg)`) y se muestra en un div de error visible al usuario. Sin `console.error` aislado.
2. **`setStampResult` con tipo discriminado** (usado en PWA `Scan.tsx`). Los resultados de RPC se interpretan por `status` y `error` del JSON retornado. Estados `'cooldown'` y `duplicate` se muestran como advertencia (ámbar), éxito como verde. El botón de acción se deshabilita según el estado, no según el error.
3. **`console.error()` sin feedback al usuario** (Layout.tsx, AuthProvider.tsx, Customers.tsx en algunos paths).
4. **Ignorar el objeto `error` del SDK y solo usar `data`** (varios lugares en Customers, Campaigns).

---

## 7. Inconsistencias y Deuda Técnica

### 7.1 Críticas

| ID | Hallazgo | Ubicación | Impacto |
|----|----------|-----------|---------|
| **D5** | Faltan políticas DELETE en todas las tablas — datos huérfanos no se pueden limpiar sin SQL directo | `supabase-migration.sql` | Operabilidad |

### 7.2 Altas

| ID | Hallazgo | Ubicación |
|----|----------|-----------|
| **D9** | Cada página (`Customers`, `Campaigns`, `ProgramSetup`) todavía re-consulta `business_id` individualmente en vez de recibirlo vía contexto o props desde `Layout`. `Dashboard.tsx` ya consume `businessId` desde `useAuth()`. | `Customers.tsx`, `Campaigns.tsx`, `ProgramSetup.tsx` |
| **D10** | `AuthProvider` centraliza el listener `onAuthStateChange`, pero las páginas hijas no lo usan — si la sesión expira durante la navegación, solo `Layout`/`AdminLayout` reaccionan. Las páginas internas (`Dashboard`, `Customers`, etc.) no detectan el cambio. | `Dashboard.tsx`, `Customers.tsx`, etc. |

### 7.3 Medias

| ID | Hallazgo | Ubicación |
|----|----------|-----------|
| **D15** | Nombres de columnas mezclan `snake_case` y `camelCase` en TypeScript; se parchea con `as any` | `Layout.tsx:36`, `Dashboard.tsx:50` |
| **D16** | Parámetros de RPC con convenciones inconsistentes: `p_name` (húngaro), `request_id` (snake), `cust_id` (abreviado) | `supabase-migration.sql` |

### 7.4 Bajas

| ID | Hallazgo | Ubicación |
|----|----------|-----------|
| **D17** | El trial de 30 días está hardcodeado en 2 lugares (SQL trigger, SQL función) | `supabase-migration.sql:109,314` |
| **D18** | `PaymentBanner` tiene valores fallback hardcodeados además de `import.meta.env` | `PaymentBanner.tsx:16-17` |

### 7.5 Resueltas (esta iteración)

| ID | Hallazgo | Solución |
|----|----------|----------|
| ~~D1~~ | `customers` RLS UPDATE era `WITH CHECK (true)` | Reemplazado por `is_business_owner` (USING + WITH CHECK) |
| ~~D2~~ | `customers` y `stamp_requests` RLS INSERT eran `WITH CHECK (true)` | Reemplazado por `is_business_owner`. PWA usa los RPC `register_customer` y `create_stamp_request` (`SECURITY DEFINER`) |
| ~~D3~~ | `DATABASE_URL` en `packages/backend/.env` expuesto | `packages/backend/` completo eliminado |
| ~~D4~~ | Supabase URL y anon key hardcodeados | Migrado a `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` en ambos `.env` |
| ~~D6~~ | `Dashboard.tsx` `loadPending` hacía N+1 queries (1 + 2N) para resolver customer y program por cada solicitud pendiente | Reescrito con PostgREST joins: `select('*, customer:customers(name, phone), program:programs(title, reward)')` en una sola petición |
| ~~D7~~ | `packages/backend/` entero era código muerto | Eliminado del monorepo |
| ~~D8~~ | `useAuth.ts` era código muerto incompatible con Supabase Auth | Eliminado. Reemplazado por `AuthProvider.tsx` con `useAuth()` real |
| ~~D11~~ | `PhoneInput.tsx` duplicado en web y pwa | Movido a `packages/shared/src/PhoneInput.tsx` |
| ~~D12~~ | `supabase.ts` duplicado en web y pwa | Movido a `packages/shared/src/supabase.ts` |
| ~~D13~~ | `index.css` duplicado en web y pwa | Movido a `packages/shared/src/index.css` |
| ~~D14~~ | No existía `packages/shared/` | Creado como workspace con exports para supabase, PhoneInput e index.css |
| ~~D19~~ | `packages/backend` listado como workspace con scripts `dev:backend`, `db:*` | Workspace y scripts eliminados del root `package.json` |
| ~~D20~~ | PWA no tenía iconos reales — el manifest referenciaba `icon-192.png` y `icon-512.png` inexistentes | Creado `icon.svg` (indigo `#4338ca` con "S" blanca). `vite.config.ts` apunta a `icon.svg` con `sizes: 'any'` y `type: 'image/svg+xml'` |
| ~~D21~~ | El QR hardcodeaba `http://localhost:5174` — no funcionaba en producción | `QrCode.tsx` ahora lee `import.meta.env.VITE_PWA_URL` con fallback a `http://localhost:5174` para desarrollo |
| ~~D22~~ | `Register.tsx`: transacción parcial — `signUp` exitoso pero inserción en `businesses` fallaba dejando cuentas huérfanas | `handleRegister` envuelto en `try/catch` con `finally`; errores del SDK visibles en UI; sin `console.error` aislado |
| ~~D23~~ | Condición de carrera entre `Register.tsx` y `AuthProvider.tsx` — `signUp` autologueaba y disparaba el listener antes de que `register_business` completara | `AuthProvider` migrado a `.maybeSingle()` con reintento de 2000ms; solo `signOut` si el reintento también falla |
| ~~D24~~ | `AuthProvider` perdía la sesión al recargar (F5) en rutas protegidas — `loading` se seteaba prematuramente y `onAuthStateChange` competía con la hidratación inicial | Refactorizado a un solo `useEffect`: `getSession()` → `await loadBusiness()` → `finally { setLoading(false) }`. El listener ya no toca `loading`. Flag `cancelled` para prevención post-unmount |
| ~~D25~~ | PWA permitía solicitar sellos en comercios sin programas activos, generando solicitudes corruptas que congelaban el panel del comercio | `Scan.tsx` carga programas apenas se conoce el `businessId`. Si `programs.length === 0`, muestra banner ámbar y deshabilita el botón de solicitud |
| ~~D26~~ | Vulnerabilidad de fraude por doble escaneo — un cliente podía generar múltiples solicitudes instantáneas | `create_stamp_request` RPC agregó bloque cooldown: `SELECT` en `stamp_requests` filtrando `created_at > now() - interval '5 minutes'`. Si encuentra registro, retorna `{ id: null, status: 'cooldown' }`. La PWA interpreta `cooldown` y muestra alerta ámbar |
| ~~D27~~ | La PWA no podía leer programas porque RLS `programs` SELECT requería `is_admin()` o `is_business_owner()` | Políticas SELECT de `programs` reemplazadas por `CREATE POLICY "Programas visibles para todos" ON programs FOR SELECT USING (true)`. INSERT/UPDATE siguen restringidos a `is_business_owner` |
| ~~D28~~ | El script `build` de la raíz solo compilaba web y pwa vía scripts delegados; `packages/shared` no tenía build step definido | `build` unificado: `npm run build -w packages/web && npm run build -w packages/pwa`. Shared no necesita build porque Vite transpila `.ts`/`.tsx` directamente desde source |

---

*Documento actualizado: 2026-05-05 · Proyecto: Sella v0.1 (pre-MVP)*

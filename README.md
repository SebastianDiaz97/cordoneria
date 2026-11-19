# Cordonería

Sistema de gestión para una cordonería: ventas de mostrador, inventario,
arreglos de prendas, clientes, caja, informes y configuración. Frontend en
React + TypeScript sobre Supabase, con las operaciones críticas de ventas,
stock y cobros delegadas en funciones RPC de PostgreSQL.

## Stack

- React 19 + TypeScript + Vite.
- Tailwind CSS v4 con un kit de componentes propio (`src/components/ui`).
- Supabase (`@supabase/supabase-js`): autenticación, base de datos y RPC.
- React Router para las rutas protegidas.
- Recharts, date-fns, Zod, React Hook Form y Sonner.

## Funcionalidades

### Autenticación y usuarios

- Ingreso con correo y contraseña mediante Supabase Auth.
- Roles `admin` y `employee`; las rutas exigen sesión y perfil activo.
- Los usuarios nuevos quedan inactivos hasta que un administrador los active
  desde **Configuración → Usuarios**.
- Solo un administrador puede cambiar roles, activar o desactivar usuarios y
  modificar la configuración del negocio.
- La zona horaria se muestra fija por ahora (no editable).

### Inicio

- Métricas de ventas de hoy, del mes y del período, ganancia estimada, dinero
  cobrado por ventas y arreglos, estado de caja y stock bajo.
- Gráficos de ventas/ganancia por día, ingresos por método de pago y resumen de
  arreglos por estado.
- Accesos a arreglos pendientes, listos para retirar y atrasados, más el
  listado de productos por reponer.

### Ventas

- Buscador de productos, carrito con cantidades, precio editable y descuento
  por línea, descuento general y observaciones.
- Cliente opcional y pagos divididos entre varios métodos.
- En efectivo se puede ingresar un monto mayor al total: la venta registra solo
  el monto aplicado y muestra el **vuelto**. Los demás métodos no pueden
  superar el total.
- Historial de ventas con detalle y anulación.

### Inventario

- Productos con SKU, código de barras, categoría, proveedor, unidad, costo,
  precio, stock actual y stock mínimo.
- Categorías y proveedores editables.
- Registro de compras que actualiza stock y costo mediante RPC.
- Ajustes manuales de stock con motivo y trazabilidad de movimientos.
- El stock nunca se modifica directamente desde React: ventas, compras,
  ajustes y materiales usan funciones RPC.

### Arreglos

- Órdenes con una o varias prendas, servicios del catálogo, materiales y
  fechas estimadas.
- Abono inicial repartido proporcionalmente entre las prendas; en efectivo se
  permite entregar de más y se muestra el vuelto.
- Flujo de estados por prenda (recibida, en proceso, lista, entregada,
  cancelada) con historial de cambios.
- Registro de pagos parciales, avisos al cliente por WhatsApp/llamada/presencial
  y notas internas.
- Cobro de guarda por día o monto fijo, con días de gracia; un administrador
  puede eximirla al entregar.
- Entrega individual y **entrega conjunta** de varias prendas listas con un
  solo cobro, repartiendo los pagos entre las prendas seleccionadas.
- Cancelación de prendas con reembolso y anulación de materiales con motivo.

### Clientes

- Alta, edición e inactivación de clientes con teléfono, WhatsApp, correo y
  notas.
- Historial de ventas y arreglos, saldo pendiente y notas de seguimiento.

### Caja

- Apertura con monto inicial, cierre con efectivo contado y diferencia.
- Movimientos manuales: gastos, retiros, depósitos y otros ingresos.
- Detalle de pagos recibidos y movimientos de la caja abierta, más historial de
  cierres.

### Informes

- Rango de fechas configurable.
- Ventas, ganancia estimada, tickets, ticket promedio, compras, gastos,
  depósitos y arreglos por estado.
- Rankings de productos y clientes, stock bajo, compras y movimientos manuales.
- Exportación CSV de ventas, productos y caja.

### Configuración

- Nombre del negocio, moneda, zona horaria y política de stock negativo.
- Reglas de almacenamiento: días de gracia y modalidad de cobro de guarda.
- Administración de usuarios (rol y estado).

## Reglas de negocio importantes

- Los importes se guardan como `NUMERIC`; la moneda por defecto es CLP.
- Los pagos se registran siempre por el monto aplicado al saldo. El vuelto de
  efectivo es solo visual: no se almacena ni se imprime en el comprobante.
- Un pago no puede superar el saldo de la prenda ni el total de una venta
  (salvo el efectivo, que se recorta antes de enviarlo a la RPC).
- La entrega de una prenda exige que los pagos sumen exactamente el saldo
  (`precio del servicio + guarda − pagado`).
- La entrega conjunta se ejecuta prenda por prenda; si una falla, se informa el
  resultado parcial y las prendas ya entregadas quedan entregadas.
- Los usuarios se crean desde **Supabase Authentication**. El correo no se
  almacena en `profiles`, por lo que la tabla de usuarios muestra el nombre.

## Puesta en marcha

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Crear el archivo `.env` a partir de `.env.example`:

   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   ```

   Usar solo la `anon key`; nunca la `service_role` en el frontend.

3. En un proyecto Supabase nuevo, ejecutar `migraciones.txt` completo en el
   **SQL Editor**. El archivo crea tablas, RLS, triggers y todas las funciones
   RPC del sistema.

4. Crear el primer usuario en **Authentication → Users**, activarlo en
   **Configuración → Usuarios** y asignarle el rol de administrador.

5. Iniciar el entorno local:

   ```bash
   npm run dev
   ```

## Comandos

| Comando                | Descripción                                          |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Servidor de desarrollo con Vite.                     |
| `npm run build`        | Verifica TypeScript y genera la build de producción. |
| `npm run preview`      | Sirve la build de producción.                        |
| `npm run typecheck`    | Verifica TypeScript sin emitir archivos.             |
| `npm run lint`         | Ejecuta ESLint.                                      |
| `npm run format`       | Aplica Prettier.                                     |
| `npm run format:check` | Comprueba el formato sin modificar archivos.         |

## Estructura

```text
src/
  auth/         Sesión, perfil, roles y rutas protegidas.
  components/   Layout (header/sidebar), UI kit y estados de carga/error.
  features/     Modales y tablas por dominio (inventario, arreglos, ventas).
  hooks/        Hooks compartidos (useAsync).
  lib/          Cliente Supabase, formato, cálculos de pagos y utilidades.
  pages/        Pantallas de la aplicación.
  routes/       Definición de rutas.
  services/     Acceso a datos y RPC por dominio.
  types/        Tipos del dominio.
migraciones.txt Script SQL completo para Supabase.
```

## Limitaciones conocidas

- No hay pruebas automatizadas; la verificación se hace con `typecheck`,
  `lint` y `build`.
- El correo de los usuarios no se puede mostrar sin agregar una columna a
  `profiles` o una RPC de lectura sobre `auth.users`.
- El vuelto en efectivo no se persiste ni aparece en comprobantes.
- La entrega conjunta no es atómica a nivel de base de datos.
- La build genera un chunk principal mayor a 500 kB (aviso de Vite, no error).

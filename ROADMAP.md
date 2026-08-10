# MediTraslado — Hoja de ruta

## Estado actual

Frontend completo y pulido (Dashboard, Pacientes, Traslados, Calendario semanal, Historial; placeholder solo en Ajustes). Base de datos conectada (Supabase/Postgres) con schema y seed reales. Login y roles funcionando de punta a punta, con escopado por centro (RECEPCIONISTA) y restricción de página (Calendario admin/recepción). **Todas las vistas ya leen y escriben contra la base real** — `lib/mock-data.ts` no existe más.

---

## Etapa 1 — Backend y persistencia

### 1. Base de datos ✅
- [x] Proveedor: Supabase/Postgres
- [x] Prisma 7 instalado y configurado (`prisma.config.ts`, driver adapter `@prisma/adapter-pg`)
- [x] Schema en `prisma/schema.prisma`: `Usuario`, `Centro`, `Chofer`, `Paciente`, `PacienteHorario`, `PacienteCita`, `Traslado` — camelCase, un solo `horaCita` por traslado, chofer ida/vuelta, `requiereSillaDeRuedas`/dirección solo en `Paciente` (fuente única de verdad)
- [x] Migración inicial aplicada (`prisma/migrations/20260729135358_init`)
- [x] Seed (`prisma/seed.ts`) con los mismos pacientes/centros/choferes que `lib/mock-data.ts`, corriendo contra la base real
- [x] Cliente singleton en `lib/prisma.ts`

### 2. Autenticación ✅
- [x] NextAuth v5 (`next-auth@beta`) con Credentials provider (`auth.ts`), password hasheada con `bcryptjs` contra `Usuario` en la base real
- [x] Roles `ADMIN` / `RECEPCIONISTA` / `CHOFER` propagados a la sesión (JWT)
- [x] Página de login (`app/login/page.tsx`)
- [x] `proxy.ts` (Next 16 renombró `middleware.ts`) protege todas las rutas — redirige a `/login` si no hay sesión
- [x] Rutas reorganizadas en `app/(app)/...` para que el login no tenga sidebar/header
- [x] Header/Sidebar muestran el usuario real de la sesión + botón de cerrar sesión
- [x] Restricción de página por rol: CHOFER solo puede acceder a `/calendar` (su "ruta semanal", filtrada por `choferAsignado`) y `/settings` — Dashboard/Traslados/Pacientes/Historial redirigen server-side a `/calendar` (`proxy.ts`), y no aparecen en el Sidebar. `session.user.choferId` se propaga igual que `centroId`

### 3. API routes (`app/api/`) ✅
- [x] `GET /api/pacientes`, `POST /api/pacientes`, `PATCH /api/pacientes/[id]`
- [x] `GET /api/traslados` (de hoy, con paciente/chofer/centro incluidos)
- [x] `GET /api/centros`, `GET /api/choferes`
- Stats del Dashboard se calculan client-side a partir de `/api/traslados` + `/api/pacientes` (no hizo falta un endpoint aparte)
- *No incluido: DELETE de pacientes — no hay UI que lo dispare todavía*

### 4. Conectar el frontend ya construido a la API real ✅
- [x] `lib/mock-data.ts` → `lib/types.ts` (solo tipos + `DIA_ABREVIADO`) + `lib/api-client.ts` (fetch wrappers)
- [x] Estados de loading/error simples en Dashboard, Pacientes, PatientsPanel
- [x] `PatientsModal` → `PATCH /api/pacientes/[id]` (editar) y `POST /api/pacientes` (alta, botón "+ Paciente"), con `centros`/`choferes` fetcheados al abrir el modal
- [x] Verificado: una edición persiste tras recargar la página y confirmado directo contra la tabla en Supabase
- [ ] `WhatsAppModal` → sigue siendo placeholder hasta Etapa 2 (correcto, como estaba planeado)

### 5. Calendario semanal ✅
- [x] Página `/calendar`: grilla estilo Excel (Hora × día de semana, franjas de 15 min) a partir del horario recurrente de cada paciente (`paciente.horarios`) — es una plantilla fija, no depende del día de hoy
- [x] ADMIN elige el centro a inspeccionar con un `<select>`; RECEPCIONISTA ve directo el suyo (sin selector)
- [x] Hover sobre el nombre del paciente muestra dirección, teléfono, chofer asignado y alertas

### 6. Lógica de negocio ✅
- [x] Generación automática de traslados diarios (`lib/traslados.ts` → `generarTrasladosDelDia`): para cada paciente activo con turno hoy (horario recurrente o `PacienteCita` puntual) que todavía no tenga un `Traslado` para esa fecha, lo crea con su chofer asignado y centro. Idempotente — corre en cada `GET /api/traslados`, no duplica
- [x] Expiración automática por hora (`expirarTrasladosVencidos`): cualquier traslado que siga PENDIENTE con `horaCita` ya pasada se marca EXPIRADO — chequeo al leer, sin necesidad de cron
- [x] Cancelación independiente por tramo (ida / vuelta): `Traslado.idaCancelada`/`vueltaCancelada` (booleanos, migración `traslado_cancelacion_por_tramo`) — un paciente puede cancelar solo la ida (ej: lo lleva la familia) o solo la vuelta sin afectar el otro tramo. Se mantiene un solo `estado` global: si se cancelan ambos tramos pasa a CANCELADO automáticamente; si se reactiva alguno estando en CANCELADO por esta regla, vuelve a PENDIENTE (necesita reconfirmarse). Botones "Cancelar"/"Reactivar" en `TransferDetail`, junto a cada chofer (ida/vuelta)

### 7. Vista de Traslados + modal crear/editar ✅
- [x] Página `/transfers`: cola de traslados en cards (mismo estilo que Pacientes), footer con ciudad del paciente → centro de destino
- [x] `TrasladoModal` único para crear y editar (paciente, horario, centro, chofer ida/vuelta, estado, observación) — usado desde "Modificar" (Traslados y Dashboard) y desde el botón "Traslado" en la ficha de cada paciente
- [x] `POST /api/traslados` bloquea con 409 si el paciente ya tiene un traslado hoy

### 8. Historial del sistema ✅
- [x] Modelo `Evento` (`mensaje`, `usuarioNombre`, `pacienteId`/`trasladoId` opcionales) — log de auditoría real, no mock
- [x] Se registra automáticamente en cada mutación: alta/edición de paciente (con diff de qué campos cambiaron), creación/edición de traslado, cancelación por tramo, generación automática diaria y expiración automática
- [x] `GET /api/eventos` escopado por centro para RECEPCIONISTA (vía `paciente.centroId`)
- [x] `HistoryPanel.tsx` (Dashboard, solo eventos de hoy) y página `/history` (historial completo, filtro "Solo hoy"/"Todo") reemplazan el placeholder

---

## Etapa 2 — WhatsApp Automático

*Depende de que la Etapa 1 (backend) esté funcionando.*

- [ ] Cuenta de WhatsApp Business + Meta Cloud API (número verificado, tokens) — **pendiente del lado del usuario**, no es código: crear app en developers.facebook.com, sacar phone number ID + token, dar de alta y esperar aprobación de la plantilla "recordatorio" en el Administrador de WhatsApp
- [x] `POST /api/whatsapp/send` — envía la plantilla "recordatorio" (requiere aprobación de Meta) o texto libre para el resto (`lib/whatsapp.ts`), conectado al botón real de `WhatsAppModal.tsx` (ya no simula)
- [x] `POST /api/whatsapp/webhook` — recibe respuestas del paciente, verifica firma `X-Hub-Signature-256` (rechaza con 401 si no coincide), handshake de verificación por `GET`
- [x] Parsing de respuestas ("si"/"no"/"1"/"2"/etc.) → matchea por teléfono + traslado del día → actualiza `estado` automáticamente + registra `Evento` + responde acuse por texto libre. Verificado con payloads simulados (formato real de Meta, firma HMAC calculada a mano) contra la base real — falta la prueba end-to-end con Meta real + ngrok
- [x] Cron de envío automático (recordatorio día anterior / mismo día): lógica `enviarRecordatoriosAutomaticos` (`lib/notificaciones.ts`, plantilla `recordatorio_traslado`, idempotente vía Evento) + endpoint `POST/GET /api/cron/recordatorios` protegido con `CRON_SECRET` en .env — listo para conectar a cualquier scheduler (Vercel Cron, GitHub Actions, etc.) cuando la app esté deployada
- [x] Notificación a choferes con su ruta del día: `notificarRutasChoferes` (`lib/notificaciones.ts`) agrupa los traslados del día por chofer (ida/vuelta) y envía la ruta por WhatsApp (usa `Chofer.telefonoAlternativo`, poblado en el seed); disparada desde el botón "Enviar ruta a choferes" en `/transfers` (`POST /api/whatsapp/choferes`)

---

## Etapa 3 — Reportes y Panel Chofer

- [x] Vista del chofer con traslados reales de la semana (solo lectura): `ChoferWeekGrid` (`/calendar` en rol CHOFER) muestra los `Traslado` reales LUN–DOM con su fecha, marcas "Entrada"/"Salida" y estado; el chofer no puede cancelar/reactivar tramos (la ruta del día llega por WhatsApp). `GET /api/traslados` acepta `desde`/`hasta` y se escopa automáticamente por chofer; `PATCH /api/traslados/[id]` restringe a choferes (403 si el traslado no es suyo)
- [x] Entrada/salida diferenciadas en el calendario del chofer: `Paciente` ahora tiene `choferVuelta` (puede ser distinto al chofer de ida) y `duracionEstimadaMin` (default 45) — la grilla muestra una marca "Entrada" en la hora de turno y una "Salida" en turno + duración, cada una solo si ese chofer corresponde a ese tramo
- [x] Restricción de página por rol para CHOFER (Dashboard/Traslados/Pacientes/Historial bloqueados, solo Calendario + Ajustes)
- [x] Eliminar pacientes — privilegio exclusivo de ADMIN: `DELETE /api/pacientes/[id]` (403 para otros roles), botón "Eliminar" solo visible para admin en `/patients` con modal de confirmación; borra en cascada horarios/citas/traslados del paciente antes de eliminarlo (los eventos de historial quedan, con `pacienteId` en null)
- [x] Reportes / exportación: página `/reports` (Admin/Recepción, entrada en el Sidebar) con filtros por tipo (Traslados / Pacientes / Carga por chofer / **Historial-auditoría**), rango de fechas y centro, y barra de resumen con totales (por estado en Traslados, por chofer en Carga, por usuario en Historial, activos/inactivos en Pacientes). `GET /api/reportes` devuelve filas planas; el frontend exporta a **Excel (.csv con BOM, separador `;`)** y a **PDF** (vista de impresión con `window.print()` + estilos `@media print` en `global.css`)

## Etapa 4 — SaaS Multi-tenant (futuro)

- [ ] Multi-organización
- [ ] Planes y facturación

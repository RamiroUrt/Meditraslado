# MediTraslado

CRM de traslados de pacientes para centros de kinesiología. Gestiona pacientes, choferes, centros y los traslados diarios (ida/vuelta) entre el domicilio del paciente y su centro de atención.

Este proyecto es un **rediseño completo desde cero** de una versión anterior (`meditraslado-demo`), con un frontend nuevo (look claro/redondeado tipo SaaS moderno, con modo oscuro) y ahora conectado a un backend real (Prisma + Supabase).

---

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + TypeScript
- **Prisma 7** + **PostgreSQL (Supabase)** — nótese que Prisma 7 cambió su forma de configurarse respecto a versiones anteriores (ver `prisma.config.ts`, sin `url`/`directUrl` en el schema)
- **NextAuth v5** (`next-auth@beta`) — Credentials provider, JWT, roles
- **lucide-react** para íconos
- CSS plano, **todo unificado en un solo archivo**: `src/styles/global.css` (decisión explícita del usuario — no hay CSS colocado por componente)

> ⚠️ Este proyecto usa versiones muy recientes (Next 16, Prisma 7, NextAuth v5 beta) que tienen cambios importantes respecto a lo que la mayoría de la documentación/entrenamiento de IA conoce. `AGENTS.md` en la raíz lo advierte explícitamente. Antes de asumir cómo funciona algo (middleware, generación de Prisma Client, config de NextAuth), conviene revisar `node_modules/next/dist/docs/` o buscar la doc oficial actualizada.

---

## Cómo correrlo

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000` — redirige a `/login` si no hay sesión.

**Usuarios de prueba** (seed, password `123456` para todos):
- `admin@meditraslado.com` — rol ADMIN, ve los 4 centros combinados
- `recepcion@meditraslado.com` — RECEPCIONISTA, escopada a Kine Niños
- `recepcion.kineadultos@meditraslado.com` — RECEPCIONISTA, escopada a Kine Adultos
- `recepcion.pileta@meditraslado.com` — RECEPCIONISTA, escopada a Pileta
- `recepcion.geriatrico@meditraslado.com` — RECEPCIONISTA, escopada a Geriátrico
- `carlos.mendez@meditraslado.com`, `roberto.s@meditraslado.com`, `diego.fernandez@meditraslado.com` — rol CHOFER

Para resetear/recrear los datos de prueba: `npx prisma db seed` (ver `prisma/seed.ts`).

---

## Estructura relevante

Todo el código de la app vive en `src/` (salvo `prisma/`, `public/` y los archivos de config, que quedan en la raíz). Cada componente tiene su propia carpeta con su nombre; no hay `index.ts` de re-export.

```
src/
  app/
    layout.tsx              ← root layout: fuentes, script anti-flash de tema, <AppProviders> (sin sidebar/header)
    page.tsx                ← redirige a /dashboard
    login/page.tsx          ← página de login (fuera del route group, sin chrome)
    (app)/                  ← route group: todo lo que SÍ tiene sidebar/header
      layout.tsx            ← <AppShell> (Sidebar + Header + drawer mobile)
      dashboard/ patients/ transfers/ history/ settings/ calendar/  ← page.tsx de cada sección
    api/
      auth/[...nextauth]/route.ts
      pacientes/route.ts (GET/POST) + [id]/route.ts (PATCH/DELETE)
      traslados/route.ts (GET/POST) + [id]/route.ts (PATCH)
      centros/route.ts, choferes/route.ts, eventos/route.ts (GET)
      whatsapp/send/route.ts (POST), whatsapp/webhook/route.ts (GET verificación, POST respuestas)

  proxy.ts                  ← reemplaza middleware.ts (Next 16 lo renombró) — Next.js exige que esté en la raíz de src/, protege rutas y redirige a /login

  lib/
    auth.ts                 ← config de NextAuth (Credentials + bcrypt + Prisma)
    prisma.ts               ← singleton de PrismaClient (driver adapter @prisma/adapter-pg)
    session.ts              ← requireSessionUser() para las API routes
    api-client.ts           ← fetch wrappers tipados que usa el frontend
    traslados.ts, eventos.ts, whatsapp.ts, useFotoPerfil.ts

  providers/
    AppProviders.tsx        ← envuelve <SessionProvider> (y futuros providers)

  types/                    ← todos los tipos centralizados acá, agrupados por área
    models.ts               ← Paciente, Traslado, Centro, Chofer, DiaSemana, EstadoTraslado, Evento
    ui.ts, layout.ts, dashboard.ts, modals.ts, calendar.ts   ← Props de cada grupo de componentes
    next-auth.d.ts          ← augmentation de tipos para session.user.rol

  components/
    ui/                     ← un átomo por carpeta: Badge/, Button/, Modal/, Input/, Select/, Textarea/, Label/, Checkbox/, Spinner/, Loader/
    layout/                 ← AppShell/, Header/, Sidebar/ (una carpeta por componente)
    modals/                 ← PatientsModal/, TrasladoModal/, WhatsAppModal/ (una carpeta por componente)
    Dashboard/              ← StatsCards, TransferList, TransferDetail, PatientsPanel, HistoryPanel (grupo, archivos sueltos)
    Calendar/                ← WeeklyScheduleGrid (único archivo del grupo)

  styles/global.css          ← TODO el CSS del proyecto vive acá
  assets/images/logo.png

prisma/
  schema.prisma           ← Usuario, Centro, Chofer, Paciente, PacienteHorario, PacienteCita, Traslado, Evento
  pacientes-data.ts       ← generador de pacientes de ejemplo (zona Venado Tuerto, Santa Fe, y alrededores)
  seed.ts                 ← ~60 pacientes de ejemplo repartidos en los 4 centros (~70% con chofer asignado,
                             el resto tiene su turno fijo pero sin chofer — no generan traslados automáticos)

ROADMAP.md                ← hoja de ruta detallada por etapas (leer esto para saber qué sigue)
```

---

## Qué está hecho

1. **Frontend completo**: Dashboard (stats cards + cola/detalle de traslados en patrón master-detail, sin scroll de página — solo internal scroll donde hace falta), Pacientes (listado + filtros + edición), modo claro/oscuro con persistencia en `localStorage`, look redondeado tipo SaaS (logo con gradiente azul→cian→verde).
2. **Modo mobile**: un solo breakpoint (`@media max-width: 768px` en `global.css`) convierte el sidebar en un drawer deslizable (`components/layout/AppShell/AppShell.tsx` maneja el estado de apertura, con backdrop y cierre automático al navegar) y apila todos los paneles lado-a-lado (Dashboard, filtros de Pacientes/Traslados, filas de modal, Ajustes). El calendario semanal ya tenía scroll horizontal propio; se le sumó soporte de tap (no solo hover) para el popover de info del paciente, ya que en touch no hay hover.
3. **Modelo de datos simplificado**: un traslado tiene **un solo horario de turno** (no hora de salida + hora de vuelta por separado — se simplificó explícitamente porque confundía), un solo `estado` general (no un estado separado para ida y para vuelta), pero sí mantiene chofer de ida y chofer de vuelta como conceptos separados.
4. **Base de datos real**: Prisma + Supabase Postgres, con schema, migración inicial y seed corriendo contra la base real (no local).
5. **Auth real**: login con email/password, roles ADMIN/RECEPCIONISTA/CHOFER en la sesión, rutas protegidas por `proxy.ts`.
6. **Frontend conectado a la API real**: Dashboard y Pacientes ya no usan mock data — leen y escriben contra Supabase vía las API routes. Verificado que las ediciones persisten tras recargar la página.
7. **Stats cards**: Confirmados / Pendientes / Cancelados / Expirados / Pacientes activos — con la card de Pacientes destacada en grande y las otras 4 en chico a la derecha.

## Qué falta (ver `ROADMAP.md` para el detalle completo)

- **Lógica de negocio** (Etapa 1, paso 5): generación automática de traslados diarios a partir del horario semanal del paciente, expiración automática, cancelación por tramo.
- **WhatsApp real** (Etapa 2): hoy el modal de WhatsApp arma el mensaje y "simula" el envío — falta integrar Meta Cloud API de verdad (enviar, webhook de respuestas, cron de recordatorios).
- **Restricción de páginas por rol**: hoy cualquier usuario logueado (sea ADMIN, RECEPCIONISTA o CHOFER) ve todo. Está pensado para la Etapa 3 (vista simplificada para choferes).
- **Historial real**: el panel de "Historial del Sistema" en el dashboard sigue siendo un placeholder vacío.
- **Crear/eliminar pacientes**: no hay UI para eso todavía, solo editar los que ya existen.
- Reportes/exportación, multi-tenant — futuro lejano (Etapas 3-4).

---

## Resumen de la sesión que armó todo esto (para dar contexto a un chat nuevo)

Si estás retomando este proyecto en una conversación nueva, esto es lo que pasó, en orden:

1. Arranqué el proyecto de cero en esta carpeta (estaba vacía), usando como referencia dos MD que el usuario tenía en `Desktop/Meditraslado(claude)/` (contexto de negocio y sistema de diseño original, dark/"centro de comando") y un logo con gradiente de marca.
2. Construí un primer frontend fiel a ese design doc (dark mode, mono/uppercase, estilo terminal).
3. El usuario pidió modo claro → lo agregué con toggle persistente.
4. El usuario mostró una captura de una versión **anterior suya** (más parecida a `meditraslado-demo`, look claro/redondeado) y pidió replicar **todo** ese estilo → hice un reskin completo (abandonando el look "terminal"), agregué íconos reales (lucide-react) en vez de emojis, y reubiqué los paneles de Pacientes/Historial.
5. Varias iteraciones de ajuste fino: tamaños de paneles, que la cola y el detalle no tuvieran scroll de página (sidebar/header fijos, solo scroll interno donde hace falta), badges de días de atención, combinar "días" + "hora de cita" en una sola sección.
6. El usuario notó que "hora de salida y vuelta" era confuso → simplifiqué el modelo a **un solo horario de turno** por traslado (mantuve chofer ida/vuelta, pero sin duplicar horas ni estados).
7. Le di funcionalidad real al botón "Modificar" (antes solo estaba en Pacientes) y conecté todo para que los cambios de un paciente se reflejen de forma consistente en el dashboard.
8. El usuario pidió unificar **todo** el CSS del proyecto en un solo archivo (`global/style/global.css`) — se hizo, eliminando ~19 archivos `.css` colocados por componente.
9. Preguntó cuánto faltaba → le armé un `ROADMAP.md` con las etapas (Backend/Auth → WhatsApp → Reportes/Chofer → Multi-tenant).
10. **Backend real**: el usuario pasó su schema de Prisma y seed de una versión anterior como referencia. Los adapté (camelCase, sin duplicar campos entre Paciente/Traslado, sin `estado_regreso` separado). Se armó una cuenta de Supabase (el usuario ya la tenía), encontramos que la base ya tenía tablas de la app vieja, el usuario confirmó que era un proyecto de prueba y se reseteó (con doble confirmación de seguridad — tanto Prisma como el harness de Claude Code bloquean resets de DB automáticos). Prisma 7 resultó tener una config completamente distinta a la que yo conocía (`prisma.config.ts`, sin `url` en el schema, generator `prisma-client` en vez de `prisma-client-js`) — lo investigué en la doc oficial antes de escribir nada.
11. **Auth real**: NextAuth v5 con Credentials + bcrypt. Investigué que Next.js 16 renombró `middleware.ts` a `proxy.ts` (mismo comportamiento, corre en Node.js runtime — confirmado en la doc local del proyecto). Reestructuré las rutas en un route group `(app)` para que `/login` no tenga sidebar/header.
12. **Conecté el frontend a la API real**: construí las API routes (`/api/pacientes`, `/api/traslados`, `/api/centros`, `/api/choferes`) siguiendo el mismo patrón que ya usaba `meditraslado-demo`, renombré `lib/mock-data.ts` → `lib/types.ts` + `lib/api-client.ts`, y conecté Dashboard/Pacientes/modales. Verificado que las ediciones persisten en la base real (no solo en memoria).
13. Agregué la card de "Expirados" a las stats y rediseñé el layout: la card de Pacientes queda grande a la izquierda, las otras 4 (Confirmados/Pendientes/Cancelados/Expirados) chicas a la derecha.

**Próximo paso lógico**: paso 5 de la Etapa 1 (generación automática de traslados + expiración automática + cancelación por tramo), o directamente Etapa 2 (WhatsApp real) si se prefiere saltear la automatización por ahora.

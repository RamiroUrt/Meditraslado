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
- Reportes/exportación, multi-tenant — futuro lejano (Etapas 3-4).

---



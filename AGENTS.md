# Sports Platform

Guía de arquitectura, convenciones y directrices de ingeniería para agentes de IA y desarrolladores en el monorepo de la plataforma deportiva multideporte (**Sports Platform**).

---

## 1. Visión General del Proyecto

Plataforma integral para la organización y gestión de torneos deportivos multideporte (Fútbol, Básquetbol, Voleibol, etc.) con:
- **Sitio Público SSR:** Consulta de resultados, cruces, tablas de posiciones y marcadores en vivo.
- **Dashboard Admin:** Gestión de torneos, fixture, asignación de árbitros y captura de estadísticas.
- **App Móvil (Tauri):** Aplicación nativa multiplataforma (Android, iOS, Desktop) empaquetada como SPA estática.
- **Backend de Alto Rendimiento:** API REST, WebSockets y OpenAPI con validación Type-Safe de extremo a extremo.

---

## 2. Topología del Monorepo

```text
sports-platform/
├── apps/
│   ├── api/                 # Backend Bun + Elysia + WebSockets + OpenAPI
│   ├── web/                 # Web Fullstack (TanStack Start)
│   └── mobile/              # App Móvil Nativa (Tauri v2 + Tanstack Router)
│
├── packages/
│   ├── db/                  # Drizzle ORM (PostgreSQL), esquemas modulares y migraciones
│   ├── schemas/             # TypeBox DTOs derivados de DB (drizzle-orm/typebox-legacy)
│   ├── api-client/          # Cliente RPC Eden Treaty + Hooks compartidos TanStack Query
│   ├── ui/                  # Componentes React compartidos (Tailwind CSS / shadcn/ui)
│   └── tsconfig/            # Configuraciones base compartidas de TypeScript
│
├── AGENTS.md                # Directrices globales para agentes de IA
├── package.json             # Configuración de workspaces (Bun)
└── turbo.json               # Pipeline de compilación y caché de Turborepo

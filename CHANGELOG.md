# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project's changes are grouped by release what a *user has to change*, not what was touched internally — the long account of a decision lives in `docs/adr/`, and the lessons in `docs/history.md`.

## Unreleased

### Added

- **Cada página pública del sitio declara su `title` y `description`.** `__root` provee el título por defecto ("Sports Platform — Torneos multideporte") y las rutas lo reemplazan con el suyo: las listas llevan títulos fijos (Torneos, Partidos, Equipos, …) y los detalles títulos dinámica desde el loader (`Titulares FC vs Suplentes FC — Sports Platform` en un partido, el nombre del torneo, del equipo, club, jugador, sede y deporte). Los títulos llegan en el HTML del servidor, no se ajustan client-side después.

### Changed

- **El contrato de partidos viaja con las relaciones de equipos.** `GET /matches` (lista) retorna ahora `items[].homeTeam` y `items[].awayTeam` (`{ id, name }`, `null` si aún no se definen — en llaves), y `GET /matches/:id` declara las relaciones que ya incluía: `homeTeam`, `awayTeam`, `winnerTeam` y `venue` (equipos completos + sede, `null` cuando no aplican) más `periods` y `events`. Cambio aditivo; los clientes que asumían la fila plana pueden seguir leyendo los mismos campos de antes. Presupuesto de round trips: la lista sigue en 2 (join con alias en el mismo select) y el detalle se fija en 1 (`apps/api/test/query-budgets.test.ts`).


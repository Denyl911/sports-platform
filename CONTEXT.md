# CONTEXT.md — Vocabulario del proyecto

Este archivo fija las palabras que usamos para hablar del dominio y del código. Úsalo en comentarios, docstrings, reportes de error, nombres de seeders, commits y PRs. **Regla central: para cada término hay una lista _Avoid:_ de palabras que este repo no usa.** Si una idea no tiene término fijo todavía, entra aquí primero — no se inventa un sinónimo en cada conversación, de eso nace el código duplicado y los agentes que no se entienden.

La otra mitad del contexto de trabajo vive en [`AGENTS.md`](./AGENTS.md) (el brief de trabajo y la topología), [`docs/adr/`](./docs/adr/) (las decisiones y su alternativa rechazada) y [`docs/decided.md`](./docs/decided.md) (preguntas respondidas y features negadas).

---

## Dominio

**Torneo** (tournament):
La entidad perenne que agrupa todas sus ediciones. Es lo que un club organiza, lo que tiene miembros con roles y lo que el guard resuelve como alcance final.
_Avoid_: campeonato, liga, competencia, copa

**Edición** (edition):
Una instancia del torneo en un periodo: tiene sus etapas, sus inscripciones y su tabla. Es el alcance intermedio entre torneo y etapa.
_Avoid_: temporada, temporada deportiva, categoría, versión, "torneo nuevo" (para referirse a una edición del mismo torneo)

**Etapa** (stage):
Una subdivisión de la edición con su formato (grupos, eliminación, liga) y sus partidos. Es donde se inscribe un equipo y donde vive la tabla de posiciones.
_Avoid_: fase, ronda (la ronda es `roundNumber`: la fila de partidos dentro de una etapa), llave (una llave es la forma de una etapa de eliminación, no la etapa en general)

**Grupo** (stageGroup):
Una agrupación de equipos dentro de una etapa de formato de grupos.
_Avoid_: zona, sector, serie, categoría

**Deporte** (sport):
El catálogo de reglas con el que se juega un torneo: cuántos periodos tiene, si admite empates y cuántos puntos da la tabla (`win`/`draw`/`loss`). Una variante con reglamento propio —fútbol sala, básquetbol 3×3, voleibol playa— es otro deporte, no una jerarquía: el nombre carga la familia ("Fútbol sala") y la fila carga el reglamento. Los eventos puntuables del deporte (`sportEventTypes`) son los que el marcador en vivo sabe sumar.
_Avoid_: disciplina, modalidad, especialidad, "variante" como entidad

**Club**:
La entidad social que presenta equipos. Un club puede tener varios equipos.
_Avoid_: institución, asociación, franquicia

**Equipo** (team):
El competidor de una edición, presentado por un club. Un equipo juega partidos; un club no.
_Avoid_: club (usado como sinónimo de equipo), selección, franquicia

**Jugador** (player):
La persona competidora, inscrita en plantillas.
_Avoid_: deportista, atleta, participante

**Plantilla** (roster):
La lista de jugadores inscritos por un equipo en una edición (`tournamentRosters`). La plantilla no es el equipo: es el elenco de jugadores que presenta.
_Avoid_: equipo (la plantilla no es el equipo), squad, alineación (la alineación es el once titular de un partido y no existe todavía en el esquema)

**Inscripción** (registration):
El registro de un equipo para competir en una etapa (`stageTeamRegistrations`). Es la unidad que el guard resuelve contra su torneo y la que el service verifica contra las plazas y fechas de la etapa.
_Avoid_: roster (para esto), matrícula, participación

**Partido** (match):
El enfrentamiento entre dos equipos en una etapa, con su estado y su marcador.
_Avoid_: juego, duelo, encuentro, evento (un match event es otra cosa)

**Estado del partido** (status):
Uno de `scheduled`, `in_progress`, `paused`, `finished`, `cancelled`, `walkover`. Las transiciones válidas están en una única tabla en `match.service.ts` — nunca se agrega una transición en el endpoint que la necesita.
_Avoid_: flags booleanos para el estado ("isLive", "isFinished"), estados nuevos sin la tabla

**Periodo** (matchPeriod):
Un segmento del tiempo de juego de un partido (según el deporte: 1a parte, 2a parte, set 1…).
_Avoid_: cuarto, set, tiempo (nombres de un deporte específico; el campo es neutro: "periodo")

**Evento de partido** (matchEvent):
Un hecho registrado durante un partido (gol, amarilla, cambio de jugador, etc.), con su periodo.
_Avoid_: acción, incidencia, nota (como verbo para recordEvent)

**Marcador** (score):
El valor corriente de un partido que se actualiza en vivo (`updateMatchScore`, rol referee).
_Avoid_: puntos para el marcador (los puntos pertenecen a la tabla de posiciones), resultado (eso es lo final)

**Resultado**:
El estado final del partido: marcador final + status `finished` o `walkover`.
_Avoid_: marcador (eso es lo vivo), "score final"

**Tabla de posiciones** (standings):
El agregado por grupo/etapa: jugados, ganados, empatados, perdidos, puntos. Se recalcula en cada cambio de marcador, no se lleva a mano.
_Avoid_: ranking, leaderboard, scoreboard, clasificación (término ambiguo fuera del fútbol)

**Fixture**:
El calendario programado de partidos de una etapa o edición, y lo que se muestra público antes de que empiecen.
_Avoid_: calendario, bracket (el bracket es la representación visual de una etapa de eliminación), schedule (como nombre de feature)

**Sede** (venue):
El lugar donde se juega un partido.
_Avoid_: cancha para el venue (la cancha es el campo de juego dentro de la sede), estadio (es un tipo de sede), local (significa "local/visita")

**Local / Visita**:
El equipo local y el visitante del partido (`homeTeamId`, `awayTeamId`).
_Avoid_: casa, anfitrión, visitante rival

**Árbitro** (referee):
Rol de torneo con permiso sobre el marcador y el estado del partido. No es un jugador ni un tipo de evento.
_Avoid_: juez, oficial, referí

**Estadista** (statistician):
Rol de torneo con permisos para registrar periodos y eventos de partido.
_Avoid_: anotador, cronometrador

**Alcance** (scope):
La cadena torneo → edición → etapa que determina quién puede hacer qué con una entidad. Es la palabra para todo lo que se resuelve en `scoped-ids.service.ts`.
_Avoid_: tenant (no es un multi-tenant genérico; el alcance es el torneo), tenencia, dominio (como sinónimo de alcance)

---

## Código

**App**:
Un ejecutable del repositorio: `apps/api` (la API Bun + Elysia) y `apps/web` (el sitio TanStack Start). No hay aún `apps/mobile` — se agrega cuando entra, no antes.
_Avoid_: servicio (un service es otra cosa), proyecto

Paquete:
Un workspace bajo `packages/` (`@sports/db`, `@sports/schemas`, `@sports/api-client`, `@sports/ui`, `@sports/tsconfig`). Los paquetes importan hacia abajo y nunca lateralmente, ni un app importa a otro app — la única excepción es el import de solo-tipos de `api/src/app` que hace `@sports/api-client` para derivar el contrato.
_Avoid_: librería, módulo, modelo

**Route**:
Una vía de entrada HTTP de la API, en `apps/api/src/routes/`. Solo traduce HTTP: valida, llama services, devuelve. No toca la base de datos.
_Avoid_: controller, handler, controlador

**Service**:
La lógica de dominio en `apps/api/src/services/`. Es la única capa que habla con `@sports/db` y la única que lanza errores de dominio. Los errores son libres de HTTP.
_Avoid_: business logic (como nombre de carpeta), repository (no hay capa repository), manager

**Guard**:
Lo que revisa quién es el llamador y si su rol lo autoriza, resolviendo el alcance (`middlewares/role.guard.ts`). El guard no filtra datos: eso le toca al service y a las condiciones de las queries.
_Avoid_: middleware genérico para esto, filtro, policy

**Middleware**:
Un pedazo que corre antes/depués del handler a nivel de request (`auth.middleware.ts`, `error.middleware.ts`). El middleware refuerza; el guard y el service proveen.
_Avoid_: hook (es de React), interceptor, plugin

**Error de dominio** (DomainError):
El único error que lanzan los services: mensaje legible + status HTTP. Los routes nunca lanzan errores crudos ni traducen strings.
_Avoid_: excepción (como término), ErrorCode (no existe), throw new Error lanzado al frontend

**Esquema** (schema):
Un TypeBox en `@sports/schemas`. Los select/insert/update se derivan de la tabla con `drizzle-orm/typebox-legacy`; los que se escriben a mano son los que el contrato real de un route exige, y nunca duplican la tabla.
_Avoid_: DTO escrito a mano, interface, archivo `type` espejo del esquema

**Cliente** (api-client):
El paquete que consume la API. Todo pasa por Eden treaty tipado contra el tipo de la App; los hooks de TanStack Query por dominio viven aquí, con sus query keys centralizadas.
_Avoid_: SDK, fetch wrapper, cliente HTTP genérico

**Live**:
La transmisión del estado de un partido en curso por WebSocket: la API publica en cada escritura (`lib/live.ts`) y los clientes se suscriben (`api-client/live/`, `hooks/useMatchLive`).
_Avoid_: streaming, realtime (como nombre de feature), push

# El fixture vive en los partidos: jornada = roundNumber, cancha = fieldNumber

**Status:** accepted
**Topic:** domain

## Context

La etapa ya sabía armar grupos y asignar equipos, pero el fixture seguía siendo manual: el admin elegía dos equipos, uno por uno, y no había forma de decir «juega todos contra todos», ni de repartir fechas, ni de distinguir dos canchas de la misma sede a la misma hora. La pantalla pública de la etapa listaba los partidos planos, sin jornada.

El modelo tenía tres huecos:

1. `matches.roundNumber` existía, pero nadie lo escribía de forma sistemática: era un número suelto, no una jornada.
2. `matches.scheduledAt` guardaba el instante, pero no había una entidad «fecha» que agrupara los partidos de un día.
3. `venues.fieldCount` declaraba cuántas canchas tiene una sede, pero ningún partido decía en cuál se juega.

La tentación era crear dos tablas nuevas: `matchdays` (una fila por jornada, con su fecha) y `venue_fields` (una fila por cancha). Las dos suenan limpias hasta que se mira lo que ya está: la jornada de un partido es el número de ronda que el algoritmo produce, la fecha es el instante del partido, y una cancha es un número dentro de una sede que ya declara cuántas tiene. Crear entidades para esas tres cosas abre la pregunta de qué pasa cuando la fila de la jornada y los partidos que dice agrupar no coinciden.

## Decision

**El fixture se deriva de los partidos, no se guarda aparte.**

- **Jornada = `matches.roundNumber`** (1-based). Es la ronda que produce el generador; un partido manual puede dejarla en `null`.
- **Fecha y hora = `matches.scheduledAt`** (`timestamptz`). No hay una fecha de jornada compartida: cada partido puede moverse solo, y la jornada se agrupa por `roundNumber` al leer.
- **Sede = `matches.venueId`**, ya existente.
- **Cancha = `matches.fieldNumber`** (entero nullable, `> 0`), validada contra `venues.fieldCount`. No es una FK a una tabla de canchas: la sede declara cuántas tiene y el número es su identidad dentro de ella. Un partido sin sede no puede tener cancha.

**La generación automática es una escritura explícita y solo para liguillas.** `POST /stages/:stageId/fixture` arma el round robin de cada grupo (o una sola liguilla si no hay grupos) con el método del círculo, alterna la localía y, con `doubleRound`, agrega la vuelta invertida. `startDate` + `intervalDays` reparten las jornadas; `kickoffTimes` + `matchDurationMinutes` reparten los turnos; `venueId` + `fieldNumbers` reparten las canchas. La zona horaria la manda el cliente (`timeZone`, IANA) y el service convierte fecha/hora local a UTC con `Intl`, sin librería de fechas.

**La eliminación directa no usa este endpoint.** Su generador sigue siendo `POST /stages/:stageId/bracket`, porque crea un árbol enlazado (`nextMatchId`/`nextMatchSlot`), no una liguilla. El generador de fixture rechaza una etapa que no sea `round_robin` y nombra la alternativa.

**Regenerar es destructivo y se confirma.** Sin `?force=true`, un fixture existente devuelve 409. Con `force`, solo se regenera si ningún partido empezó (todos `scheduled`/`cancelled`) y no hay una llave enlazada; si no, 409 con la razón.

**La lectura es completa y barata.** `GET /stages/:stageId/fixture` devuelve todos los partidos de la etapa, ordenados por jornada y fecha, con equipos y sede resueltos. No se pagina: el tamaño está acotado por los equipos de la etapa, y la pantalla necesita el fixture entero para agruparlo. Cuesta 2 round trips (existencia de la etapa + filas), fijados en `query-budgets.test.ts` (ADR 008).

**Los filtros de fecha entran en la lista existente.** `GET /matches` gana `from`/`to` (ISO, ambos inclusive sobre `scheduledAt`) y cada fila gana `venue: { id, name } | null`. Es aditivo: la lista sigue costando 2 round trips.

## What was rejected

- **Una tabla `matchdays` con su propia fecha.** Duplica la fecha que ya vive en cada partido y crea dos verdades: mover un partido a otro día deja la jornada mintiendo, o exige mantener dos escrituras. La jornada como `roundNumber` no puede desincronizarse del partido porque es el partido.
- **Una tabla `venue_fields` con una fila por cancha.** La sede ya declara `fieldCount`; una tabla de canchas agrega un alta y una baja por cada cancha y permite que el número del partido apunte a una cancha de otra sede. El entero validado contra la sede es la representación mínima que no puede mentir sobre la pertenencia. Se reconsidera si una cancha gana atributos propios (superficie, techada, disponibilidad por franja).
- **Un endpoint que arma «la fecha» con todos sus partidos y la guarda como bloque.** El fixture se lee por jornada, pero se edita por partido. Guardar el bloque obliga a decidir qué pasa cuando un partido se reprograma solo; `roundNumber` + `scheduledAt` deja que cada fila sea la verdad.
- **Generar también la llave desde el mismo endpoint.** La llave no es una liguilla: tiene árbol, byes y propagación. Mezclarlas habría metido dos algoritmos y dos formas de fallar en una ruta.
- **Calcular la zona horaria en el servidor.** El servidor no sabe en qué zona está el organizador; adivinar `America/Argentina/Buenos_Aires` o la zona del proceso produce horarios corridos. El cliente manda la zona IANA y el service solo convierte.
- **Paginar el fixture.** La pantalla necesita agrupar jornadas completas; una página de 20 partidos corta una jornada por la mitad y obliga a una segunda consulta. El conjunto está acotado por los equipos de la etapa.

## Consequences

- `matches.fieldNumber` es una columna nueva (nullable, con check `> 0`), aplicada con `db:push`; no hay migración generada (el ledger sigue vacío, `docs/todo.md` P2).
- `PATCH /matches/:id`, `PATCH /matches/:id/venue` y `POST /matches` validan la cancha contra la sede y rechazan una cancha sin sede. Quitar la sede limpia la cancha.
- `roundNumber` deja de ser un campo decorativo: el generador lo escribe, el fixture ordena por él y la UI agrupa por él. Un partido manual puede seguir sin jornada.
- El admin gana una tabla de fixture por jornada (fase 2) y el sitio público una vista por jornada (fase 3); los choques de equipo/cancha en todas las escrituras quedan como fase 3 (`docs/todo.md`).
- Los hooks `useStageFixture` y `useGenerateFixture` viven en `@sports/api-client`; la invalidación de `matches.all()` cubre la lectura del fixture, que cuelga de la misma raíz.

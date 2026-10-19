# El avance entre etapas es una recomputación, no una cola

**Status:** accepted
**Topic:** domain

## Context

Un torneo con fase de grupos y después eliminación directa necesita mover equipos de la primera a la segunda. La tentación es un comando ("avanzar") que el organizador corre una vez cuando la fase cierra: es el modelo que la mayoría de las plataformas deportivas expone, y es el primero que se implementa.

Ese modelo tiene dos problemas. Primero, **esconde el estado**: "quién clasifica hoy" solo existe después de correr el comando, así que el organizador no puede verlo ni corregirlo antes. Segundo, **no es reversible**: si un resultado de grupo se corrige después de que la llave ya se generó, la tabla y la llave quedan con dos verdades distintas y nada las reconcilia.

La tabla ya anticipaba esto: `tournamentStages.advancementRules` (jsonb) y `matches.nextMatchId`/`nextMatchSlot` existen desde el esquema inicial y nunca se habían usado. La pregunta es qué semántica les damos.

## Decision

**El avance es una recomputación, igual que la tabla de posiciones.** Tres piezas, cada una idempotente:

1. **Previa de lectura.** `GET /stages/:stageId/qualifiers` recomputa la posición de cada equipo inscrito con grupo (puntos, diferencia, a favor, id) y aplica `advancementRules`: `qualified` marca a los que pasan. La regla viaja en `rule` (`null` si la etapa no alimenta a nadie). Es una función de lo que la tabla dice hoy, no de un estado guardado.
2. **Materialización en la escritura.** Al terminar un partido (o al corregir su marcador), `syncAdvancement` re-inscribe a los clasificados en la etapa siguiente (la de menor `sequenceOrder` mayor dentro de la edición): inserta los faltantes, ajusta `seedNumber` y quita los que ya no clasifican. Es un *set* equality, no un acumulado, así que correrla dos veces deja el mismo conjunto.
3. **Propagación de la llave.** Al finalizar un partido de eliminación, el ganador se escribe en el slot del siguiente (`nextMatchId`/`nextMatchSlot`). Corregir el resultado re-propaga mientras el siguiente no haya empezado; si ya empezó, la corrección devuelve 409.

**Lo único explícito es crear el árbol de la llave** (`POST /stages/:stageId/bracket`): porque eso crea filas, y crear filas no es una recomputación. La llave se genera a partir de los clasificados (o de los inscritos si no hay regla), con byes para cupos que no son potencia de 2 (los mejores sembrados avanzan directo).

**La etapa siguiente es derivada, no declarada:** es la de menor `sequenceOrder` mayor dentro de la edición. `advancementRules` solo dice *cuántos* y *cómo se cruzan* (`qualifyPerGroup`, `seeding: cross | linear`); no repite el destino, que ya está en el orden.

**Seguridad:** la materialización no toca una etapa siguiente que ya haya empezado (partidos en curso o terminados) — la razón vuelve en `reason: "target_started"`. Una etapa sin regla no alimenta a nadie (`no_rule`); sin etapa siguiente, `no_next_stage`.

## What was rejected

- **Un comando "avanzar" que el organizador corre una vez.** Esconde el estado y no es reversible; un resultado corregido deja dos verdades. El avance como recomputación es visible en cualquier momento y se reconcilia solo.
- **Una cola o job asíncrono.** La tabla de posiciones ya se recalcula en cada escritura ("la tabla se recalcula en cada cambio de marcador, no se lleva a mano", `docs/decided.md`); un job separado introduciría un segundo momento de verdad y un estado "pendiente de avanzar" que alguien tendría que vigilar.
- **Declarar el destino en la regla (`targetStageId`).** El orden ya define el siguiente (`sequenceOrder`); repetirlo es un campo que puede mentir y que hay que validar. Se reconsidera si una edición tiene etapas no lineales (p. ej. una repesca que vuelve a una etapa anterior).
- **Mezclar inscripciones manuales con las derivadas.** La etapa siguiente, cuando tiene regla, es *derivada*: sus inscritos son exactamente los clasificados. Mezclar requeriría un `source` por fila (una migración) para saber qué borrar al recomputar. v1 asume que la inscripción manual no tiene sentido en una etapa alimentada.
- **Doble eliminación, suizo, "mejores terceros", ida y vuelta.** Fuera de v1, con su razón en `docs/todo.md`. La llave generada es de eliminación simple.

## Consequences

- `tournamentStages.advancementRules` (jsonb) ahora tiene forma validada por el contrato (`advancementRulesSchema` en `@sports/schemas`, sobrescrito en insert/update de etapa); el service castea en la frontera.
- `matches.nextMatchId`/`nextMatchSlot` dejan de ser columnas muertas: la generación los escribe y la propagación los lee.
- El desempate de la tabla gana un criterio final estable (id de equipo) para que el avance sea reproducible.
- El presupuesto de round trips: `GET /stages/:stageId/qualifiers` paga 2 (etapa + filas); la fila está en `query-budgets.test.ts`. La materialización y la propagación viven en la ruta de escritura y se miden cuando se fije su fila.
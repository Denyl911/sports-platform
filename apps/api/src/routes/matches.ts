import { Elysia } from "elysia";
import {
  matchFilterQuerySchema,
  matchIdParamsSchema,
  recordLiveEventSchema,
  updateMatchScoreSchema,
} from "@sports/schemas";
import { jwtMiddleware } from "../middlewares/auth.middleware";
import { requireMatchRole } from "../middlewares/role.guard";
import {
  findMatchById,
  listMatches,
  recordLiveEvent,
  updateMatchScore,
} from "../services/match.service";

export const matchesRoutes = new Elysia({ prefix: "/matches" })
  .use(jwtMiddleware)
  // Lectura pública (sitio SSR)
  .get(
    "/",
    async ({ query }) => listMatches(query),
    {
      query: matchFilterQuerySchema,
    }
  )
  .get(
    "/:id",
    async ({ params }) => findMatchById(params.id),
    {
      params: matchIdParamsSchema,
    }
  )
  // Escritura: requiere rol referee (o superior) del torneo del partido
  .patch(
    "/:id/score",
    async ({ params, body }) => updateMatchScore(params.id, body),
    {
      auth: true,
      params: matchIdParamsSchema,
      body: updateMatchScoreSchema,
      beforeHandle: requireMatchRole("referee"),
    }
  )
  .post(
    "/:id/events",
    async ({ params, body }) => recordLiveEvent(params.id, body),
    {
      auth: true,
      params: matchIdParamsSchema,
      body: recordLiveEventSchema,
      beforeHandle: requireMatchRole("referee"),
    }
  );

import { Elysia } from "elysia";
import {
  selectMatchSchema,
  matchIdParamsSchema,
  matchFilterQuerySchema,
  updateMatchScoreSchema,
  recordLiveEventSchema,
} from "@sports/schemas";

export const matchesRoutes = new Elysia({ prefix: "/matches" })
  .get(
    "/",
    async ({ query }) => {
      // query viene tipado como MatchFilterQuery
      return [];
    },
    {
      query: matchFilterQuerySchema,
    }
  )
  .patch(
    "/:id/score",
    async ({ params, body }) => {
      // params.id es UUID y body es { homeScore, awayScore, status }
      return { success: true };
    },
    {
      params: matchIdParamsSchema,
      body: updateMatchScoreSchema,
      response: {
        //200: selectMatchSchema,
      },
    }
  )
  .post(
    "/:id/events",
    async ({ params, body }) => {
      // Registrar gol/falta en vivo y emitir por WebSocket
      return { eventId: "..." };
    },
    {
      params: matchIdParamsSchema,
      body: recordLiveEventSchema,
    }
  );

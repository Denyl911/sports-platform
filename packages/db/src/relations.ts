import { defineRelations } from "drizzle-orm";
import * as schema from "./tables";

// Declaración de relaciones (soft relations) para Drizzle Relational Queries.
// Las FK reales viven en ./schema; esto solo habilita db.query.* con `with`.
export const relations = defineRelations(schema, (r) => ({
  sports: {
    tournaments: r.many.tournaments(),
    eventTypes: r.many.sportEventTypes(),
  },
  sportEventTypes: {
    sport: r.one.sports({
      from: r.sportEventTypes.sportId,
      to: r.sports.id,
    }),
  },

  venues: {
    matches: r.many.matches(),
  },

  tournaments: {
    sport: r.one.sports({
      from: r.tournaments.sportId,
      to: r.sports.id,
    }),
    editions: r.many.tournamentEditions(),
    members: r.many.tournamentMembers(),
  },

  tournamentEditions: {
    tournament: r.one.tournaments({
      from: r.tournamentEditions.tournamentId,
      to: r.tournaments.id,
    }),
    stages: r.many.tournamentStages(),
    rosters: r.many.tournamentRosters(),
  },

  tournamentStages: {
    edition: r.one.tournamentEditions({
      from: r.tournamentStages.editionId,
      to: r.tournamentEditions.id,
    }),
    groups: r.many.stageGroups(),
    registrations: r.many.stageTeamRegistrations(),
    matches: r.many.matches(),
  },

  stageGroups: {
    stage: r.one.tournamentStages({
      from: r.stageGroups.stageId,
      to: r.tournamentStages.id,
    }),
    registrations: r.many.stageTeamRegistrations(),
    matches: r.many.matches(),
    standings: r.many.stageStandings(),
  },

  clubs: {
    teams: r.many.teams(),
  },

  teams: {
    club: r.one.clubs({
      from: r.teams.clubId,
      to: r.clubs.id,
      alias: "club",
    }),
    registrations: r.many.stageTeamRegistrations(),
    rosters: r.many.tournamentRosters(),
    standings: r.many.stageStandings(),
    homeMatches: r.many.matches({
      from: r.teams.id,
      to: r.matches.homeTeamId,
      alias: "home",
    }),
    awayMatches: r.many.matches({
      from: r.teams.id,
      to: r.matches.awayTeamId,
      alias: "away",
    }),
    wonMatches: r.many.matches({
      from: r.teams.id,
      to: r.matches.winnerTeamId,
      alias: "winner",
    }),
  },

  players: {
    rosters: r.many.tournamentRosters(),
    events: r.many.matchEvents({
      from: r.players.id,
      to: r.matchEvents.playerId,
      alias: "player",
    }),
    assistedEvents: r.many.matchEvents({
      from: r.players.id,
      to: r.matchEvents.assistPlayerId,
      alias: "assist",
    }),
  },

  stageTeamRegistrations: {
    stage: r.one.tournamentStages({
      from: r.stageTeamRegistrations.stageId,
      to: r.tournamentStages.id,
    }),
    group: r.one.stageGroups({
      from: r.stageTeamRegistrations.groupId,
      to: r.stageGroups.id,
      alias: "group",
    }),
    team: r.one.teams({
      from: r.stageTeamRegistrations.teamId,
      to: r.teams.id,
    }),
  },

  tournamentRosters: {
    edition: r.one.tournamentEditions({
      from: r.tournamentRosters.editionId,
      to: r.tournamentEditions.id,
    }),
    team: r.one.teams({
      from: r.tournamentRosters.teamId,
      to: r.teams.id,
    }),
    player: r.one.players({
      from: r.tournamentRosters.playerId,
      to: r.players.id,
    }),
  },

  matches: {
    stage: r.one.tournamentStages({
      from: r.matches.stageId,
      to: r.tournamentStages.id,
    }),
    group: r.one.stageGroups({
      from: r.matches.groupId,
      to: r.stageGroups.id,
      alias: "group",
    }),
    venue: r.one.venues({
      from: r.matches.venueId,
      to: r.venues.id,
    }),
    homeTeam: r.one.teams({
      from: r.matches.homeTeamId,
      to: r.teams.id,
      alias: "home",
    }),
    awayTeam: r.one.teams({
      from: r.matches.awayTeamId,
      to: r.teams.id,
      alias: "away",
    }),
    winnerTeam: r.one.teams({
      from: r.matches.winnerTeamId,
      to: r.teams.id,
      alias: "winner",
    }),
    periods: r.many.matchPeriods(),
    events: r.many.matchEvents(),
    // Progresión de llaves (self-references)
    nextMatch: r.one.matches({
      from: r.matches.nextMatchId,
      to: r.matches.id,
      alias: "next_match",
    }),
    loserNextMatch: r.one.matches({
      from: r.matches.loserNextMatchId,
      to: r.matches.id,
      alias: "loser_next",
    }),
  },

  matchPeriods: {
    match: r.one.matches({
      from: r.matchPeriods.matchId,
      to: r.matches.id,
    }),
  },

  matchEvents: {
    match: r.one.matches({
      from: r.matchEvents.matchId,
      to: r.matches.id,
    }),
    team: r.one.teams({
      from: r.matchEvents.teamId,
      to: r.teams.id,
    }),
    player: r.one.players({
      from: r.matchEvents.playerId,
      to: r.players.id,
      alias: "player",
    }),
    assistPlayer: r.one.players({
      from: r.matchEvents.assistPlayerId,
      to: r.players.id,
      alias: "assist",
    }),
  },

  stageStandings: {
    group: r.one.stageGroups({
      from: r.stageStandings.groupId,
      to: r.stageGroups.id,
    }),
    team: r.one.teams({
      from: r.stageStandings.teamId,
      to: r.teams.id,
    }),
  },

  users: {
    memberships: r.many.tournamentMembers(),
  },
  tournamentMembers: {
    tournament: r.one.tournaments({
      from: r.tournamentMembers.tournamentId,
      to: r.tournaments.id,
    }),
    user: r.one.users({
      from: r.tournamentMembers.userId,
      to: r.users.id,
    }),
  },
}));

/**
 * Factory estable de QueryKeys por dominio.
 * Compatible con TanStack Query v5 y para invalidación jerárquica.
 *
 * Cada dominio expone `all`, `lists`, `list`, `detail`, y sub-recursos.
 * Uso: `queryKeys.tournaments.list({sportId})` → `["tournaments","list",{sportId}]`
 */

export const tournamentKeys = {
	all: () => ["tournaments"] as const,
	lists: () => [...tournamentKeys.all(), "list"] as const,
	list: (filters?: Record<string, unknown>) =>
		[...tournamentKeys.lists(), filters ?? {}] as const,
	detail: (id: string) => [...tournamentKeys.all(), "detail", id] as const,
	editions: (tournamentId: string) =>
		[...tournamentKeys.all(), tournamentId, "editions"] as const,
} as const;

export const editionKeys = {
	all: () => ["editions"] as const,
	lists: () => [...editionKeys.all(), "list"] as const,
	// ediciones de un torneo
	listByTournament: (tournamentId: string) =>
		[...editionKeys.all(), "byTournament", tournamentId] as const,
	detail: (id: string) => [...editionKeys.all(), "detail", id] as const,
	stages: (editionId: string) =>
		[...editionKeys.all(), editionId, "stages"] as const,
} as const;

export const stageKeys = {
	all: () => ["stages"] as const,
	lists: () => [...stageKeys.all(), "list"] as const,
	listByEdition: (editionId: string) =>
		[...stageKeys.all(), "byEdition", editionId] as const,
	detail: (id: string) => [...stageKeys.all(), "detail", id] as const,
	groups: (stageId: string) => [...stageKeys.all(), stageId, "groups"] as const,
} as const;

export const groupKeys = {
	all: () => ["groups"] as const,
	lists: () => [...groupKeys.all(), "list"] as const,
	listByStage: (stageId: string) =>
		[...groupKeys.all(), "byStage", stageId] as const,
	detail: (id: string) => [...groupKeys.all(), "detail", id] as const,
} as const;

export const matchKeys = {
	all: () => ["matches"] as const,
	lists: () => [...matchKeys.all(), "list"] as const,
	list: (filters?: Record<string, unknown>) =>
		[...matchKeys.lists(), filters ?? {}] as const,
	detail: (id: string) => [...matchKeys.all(), "detail", id] as const,
} as const;

export const standingKeys = {
	all: () => ["standings"] as const,
	byGroup: (groupId: string) =>
		[...standingKeys.all(), "byGroup", groupId] as const,
	detail: (id: string) => [...standingKeys.all(), "detail", id] as const,
} as const;

export const teamKeys = {
	all: () => ["teams"] as const,
	lists: () => [...teamKeys.all(), "list"] as const,
	list: (filters?: Record<string, unknown>) =>
		[...teamKeys.lists(), filters ?? {}] as const,
	detail: (id: string) => [...teamKeys.all(), "detail", id] as const,
} as const;

export const clubKeys = {
	all: () => ["clubs"] as const,
	lists: () => [...clubKeys.all(), "list"] as const,
	list: (filters?: Record<string, unknown>) =>
		[...clubKeys.lists(), filters ?? {}] as const,
	detail: (id: string) => [...clubKeys.all(), "detail", id] as const,
} as const;

export const playerKeys = {
	all: () => ["players"] as const,
	lists: () => [...playerKeys.all(), "list"] as const,
	list: (filters?: Record<string, unknown>) =>
		[...playerKeys.lists(), filters ?? {}] as const,
	detail: (id: string) => [...playerKeys.all(), "detail", id] as const,
} as const;

export const sportKeys = {
	all: () => ["sports"] as const,
	lists: () => [...sportKeys.all(), "list"] as const,
	list: (filters?: Record<string, unknown>) =>
		[...sportKeys.lists(), filters ?? {}] as const,
	detail: (id: string) => [...sportKeys.all(), "detail", id] as const,
	eventTypes: (sportId: string) =>
		[...sportKeys.all(), sportId, "eventTypes"] as const,
	eventTypeDetail: (id: string) =>
		[...sportKeys.all(), "eventType", id] as const,
} as const;

export const venueKeys = {
	all: () => ["venues"] as const,
	lists: () => [...venueKeys.all(), "list"] as const,
	list: (filters?: Record<string, unknown>) =>
		[...venueKeys.lists(), filters ?? {}] as const,
	detail: (id: string) => [...venueKeys.all(), "detail", id] as const,
} as const;

export const userKeys = {
	all: () => ["users"] as const,
	lists: () => [...userKeys.all(), "list"] as const,
	list: (filters?: Record<string, unknown>) =>
		[...userKeys.lists(), filters ?? {}] as const,
	detail: (id: string) => [...userKeys.all(), "detail", id] as const,
} as const;

export const membershipKeys = {
	all: () => ["memberships"] as const,
	detail: (id: string) => [...membershipKeys.all(), "detail", id] as const,
	byUser: (userId: string) =>
		[...membershipKeys.all(), "byUser", userId] as const,
	byTournament: (tournamentId: string, filters?: Record<string, unknown>) =>
		[
			...membershipKeys.all(),
			"byTournament",
			tournamentId,
			filters ?? {},
		] as const,
	myMembership: (tournamentId: string) =>
		[...membershipKeys.all(), "my", tournamentId] as const,
} as const;

export const registrationKeys = {
	all: () => ["registrations"] as const,
	byStage: (stageId: string) =>
		[...registrationKeys.all(), "byStage", stageId] as const,
	byGroup: (groupId: string) =>
		[...registrationKeys.all(), "byGroup", groupId] as const,
	detail: (id: string) => [...registrationKeys.all(), "detail", id] as const,
} as const;

export const rosterKeys = {
	all: () => ["rosters"] as const,
	byEditionTeam: (editionId: string, teamId: string) =>
		[...rosterKeys.all(), editionId, teamId] as const,
	detail: (id: string) => [...rosterKeys.all(), "detail", id] as const,
} as const;

export const authKeys = {
	all: () => ["auth"] as const,
	me: () => [...authKeys.all(), "me"] as const,
} as const;

export const queryKeys = {
	tournaments: tournamentKeys,
	editions: editionKeys,
	stages: stageKeys,
	groups: groupKeys,
	matches: matchKeys,
	standings: standingKeys,
	teams: teamKeys,
	clubs: clubKeys,
	players: playerKeys,
	sports: sportKeys,
	venues: venueKeys,
	users: userKeys,
	memberships: membershipKeys,
	registrations: registrationKeys,
	rosters: rosterKeys,
	auth: authKeys,
} as const;

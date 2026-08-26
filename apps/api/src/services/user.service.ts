import { count, and, asc, eq } from "drizzle-orm";
import { db } from "@sports/db";
import { tournamentMembers, tournaments, users } from "@sports/db/tables";
import type {
	AddTournamentMember,
	UpdateUser,
	UserCreate,
	UserFilterQuery,
} from "@sports/schemas";
import { DomainError } from "./errors";

// Usuario sin el hash de contraseña (para respuestas y login)
export type UserPublic = Omit<typeof users.$inferSelect, "passwordHash">;

// ==========================================
// CRUD de usuarios
// ==========================================

// Columnas públicas de usuario: nunca exponer passwordHash
const USER_PUBLIC_COLUMNS = {
	id: users.id,
	email: users.email,
	fullName: users.fullName,
	role: users.role,
	isActive: users.isActive,
	createdAt: users.createdAt,
	updatedAt: users.updatedAt,
} as const;

export async function listUsers(filter: UserFilterQuery) {
	const conditions = [];
	if (filter.role) conditions.push(eq(users.role, filter.role));
	if (filter.isActive !== undefined)
		conditions.push(eq(users.isActive, filter.isActive));
	const where = conditions.length ? and(...conditions) : undefined;

	const [items, totalRows] = await Promise.all([
		db
			.select(USER_PUBLIC_COLUMNS)
			.from(users)
			.where(where)
			.orderBy(asc(users.fullName))
			.limit(filter.limit ?? 20)
			.offset(filter.offset ?? 0),
		db.select({ count: count() }).from(users).where(where),
	]);

	return { items, total: totalRows[0]?.count ?? 0 };
}

// Usuario público (sin hash): para rutas HTTP y guards
export async function findUserById(id: string) {
	const [user] = await db
		.select(USER_PUBLIC_COLUMNS)
		.from(users)
		.where(eq(users.id, id))
		.limit(1);

	if (!user) throw DomainError.notFound(`User '${id}' not found`);
	return user;
}

// Fila completa incluyendo passwordHash: solo uso interno (login, cambio de contraseña)
export async function findUserRecordById(id: string) {
	const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
	if (!user) throw DomainError.notFound(`User '${id}' not found`);
	return user;
}

export async function findUserByEmail(email: string) {
	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.email, email.toLowerCase()))
		.limit(1);

	if (!user) throw DomainError.notFound(`User with email '${email}' not found`);
	return user;
}

export async function createUser(data: UserCreate) {
	await assertEmailAvailable(data.email);

	const [created] = await db
		.insert(users)
		.values({
			email: data.email.toLowerCase(),
			passwordHash: await Bun.password.hash(data.password),
			fullName: data.fullName,
			role: data.role ?? "viewer_staff",
		})
		.returning(USER_PUBLIC_COLUMNS);

	return created;
}

export async function updateUser(id: string, data: UpdateUser) {
	await findUserById(id);

	// El hash de contraseña no se actualiza por esta vía (ver changePassword)
	const { passwordHash: _ignored, ...rest } = data;

	const [updated] = await db
		.update(users)
		.set(rest)
		.where(eq(users.id, id))
		.returning(USER_PUBLIC_COLUMNS);

	return updated;
}

export async function deleteUser(id: string) {
	await findUserById(id);
	await db.delete(users).where(eq(users.id, id));
}

// ==========================================
// Autenticación local
// ==========================================

// Hash dummy para igualar el tiempo de respuesta cuando el email no existe
// (mitiga enumeración de usuarios por timing)
const DUMMY_HASH = await Bun.password.hash("timing-equalizer-dummy");

export async function verifyCredentials(
	email: string,
	password: string,
): Promise<UserPublic | null> {
	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.email, email.toLowerCase()))
		.limit(1);

	if (!user?.passwordHash || !user.isActive) {
		await Bun.password.verify(password, DUMMY_HASH);
		return null;
	}

	const valid = await Bun.password.verify(password, user.passwordHash);
	if (!valid) return null;

	// Nunca exponer el hash hacia afuera
	const { passwordHash: _hash, ...publicUser } = user;
	return publicUser;
}

export async function changePassword(
	userId: string,
	currentPassword: string,
	newPassword: string,
): Promise<void> {
	const user = await findUserRecordById(userId);

	if (!user.passwordHash) {
		throw DomainError.badRequest("User has no local password set");
	}

	const valid = await Bun.password.verify(currentPassword, user.passwordHash);
	if (!valid) throw DomainError.unauthorized("Current password is incorrect");

	await db
		.update(users)
		.set({ passwordHash: await Bun.password.hash(newPassword) })
		.where(eq(users.id, userId));
}

// ==========================================
// RBAC por torneo (membresías)
// ==========================================

export async function addTournamentMember(data: AddTournamentMember) {
	await assertTournamentExists(data.tournamentId);
	await findUserById(data.userId);

	const [duplicate] = await db
		.select({ id: tournamentMembers.id })
		.from(tournamentMembers)
		.where(
			and(
				eq(tournamentMembers.tournamentId, data.tournamentId),
				eq(tournamentMembers.userId, data.userId),
			),
		)
		.limit(1);

	if (duplicate)
		throw DomainError.conflict(
			`User '${data.userId}' is already a member of tournament '${data.tournamentId}'`,
		);

	const [created] = await db.insert(tournamentMembers).values(data).returning();
	return created;
}

// Roles válidos dentro de un torneo (los globales no se asignan por membresía)
const TOURNAMENT_SCOPED_ROLES = new Set([
	"organizer",
	"referee",
	"statistician",
	"viewer_staff",
]);

export async function updateTournamentMemberRole(
	memberId: string,
	role: string,
) {
	if (!TOURNAMENT_SCOPED_ROLES.has(role)) {
		throw DomainError.badRequest(
			`Role '${role}' is not valid for a tournament member`,
		);
	}

	const [member] = await db
		.select()
		.from(tournamentMembers)
		.where(eq(tournamentMembers.id, memberId))
		.limit(1);

	if (!member)
		throw DomainError.notFound(`Tournament member '${memberId}' not found`);

	const [updated] = await db
		.update(tournamentMembers)
		.set({ role: role as (typeof tournamentMembers.$inferSelect)["role"] })
		.where(eq(tournamentMembers.id, memberId))
		.returning();

	return updated;
}

export async function removeTournamentMember(memberId: string) {
	const [member] = await db
		.select({ id: tournamentMembers.id })
		.from(tournamentMembers)
		.where(eq(tournamentMembers.id, memberId))
		.limit(1);

	if (!member)
		throw DomainError.notFound(`Tournament member '${memberId}' not found`);

	await db.delete(tournamentMembers).where(eq(tournamentMembers.id, memberId));
}

/**
 * Membresía de un usuario en un torneo (o null si no existe).
 * El check de roles globales vive en el guard, que ya recibe el usuario fresco
 * del macro `auth`; aquí solo se consulta la membresía.
 */
export async function findTournamentMembership(
	tournamentId: string,
	userId: string,
): Promise<{ role: string } | null> {
	const [membership] = await db
		.select({ role: tournamentMembers.role })
		.from(tournamentMembers)
		.where(
			and(
				eq(tournamentMembers.tournamentId, tournamentId),
				eq(tournamentMembers.userId, userId),
			),
		)
		.limit(1);

	return membership ?? null;
}

// ==========================================
// Helpers internos
// ==========================================

async function assertEmailAvailable(email: string) {
	const [existing] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, email.toLowerCase()))
		.limit(1);

	if (existing)
		throw DomainError.conflict(`A user with email '${email}' already exists`);
}

async function assertTournamentExists(tournamentId: string) {
	const [tournament] = await db
		.select({ id: tournaments.id })
		.from(tournaments)
		.where(eq(tournaments.id, tournamentId))
		.limit(1);

	if (!tournament)
		throw DomainError.badRequest(`Tournament '${tournamentId}' not found`);
}

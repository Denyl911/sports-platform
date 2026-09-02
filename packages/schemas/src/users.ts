import { tournamentMembers, users } from "@sports/db/tables";
import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-orm/typebox-legacy";
import { type Static, t } from "elysia";

// ==========================================
// 1. ESQUEMAS CRUD BASE (Generados desde DB)
// ==========================================

export const selectUserSchema = createSelectSchema(users);
export const updateUserSchema = createUpdateSchema(users);

// Usuario sin el hash de contraseña (para respuestas HTTP)
export const userPublicSchema = t.Omit(selectUserSchema, ["passwordHash"]);

// Esquema de inserción interno: el hash lo genera la API, nunca llega del cliente
export const insertUserRecordSchema = createInsertSchema(users, {
	passwordHash: t.String({ minLength: 20 }),
});

export const selectTournamentMemberSchema =
	createSelectSchema(tournamentMembers);
export const insertTournamentMemberSchema =
	createInsertSchema(tournamentMembers);

// ==========================================
// 2. DTOs PARA ENDPOINTS Y FORMULARIOS
// ==========================================

// Parámetros de ruta: /users/:id
export const userIdParamsSchema = t.Object({
	id: t.String({ format: "uuid" }),
});
export const tournamentMemberParamsSchema = t.Object({
	id: t.String({ format: "uuid" }),
});

// Registro público/API: recibe password en claro, la API genera el hash
export const userCreateSchema = t.Object({
	email: t.String({ format: "email", maxLength: 255 }),
	password: t.String({ minLength: 8, maxLength: 72 }),
	fullName: t.String({ minLength: 1, maxLength: 120 }),
	role: t.Optional(
		t.Union([
			t.Literal("super_admin"),
			t.Literal("admin"),
			t.Literal("organizer"),
			t.Literal("referee"),
			t.Literal("statistician"),
			t.Literal("viewer_staff"),
		]),
	),
});

// Login con password local (futuro OAuth: se añadirán DTOs propios)
export const userLoginSchema = t.Object({
	email: t.String({ format: "email" }),
	password: t.String({ minLength: 1 }),
});

// Refresh de tokens
export const authRefreshSchema = t.Object({
	refreshToken: t.String({ minLength: 1 }),
});

// Par de tokens emitidos (access corto + refresh largo)
export const authTokenPairSchema = t.Object({
	accessToken: t.String(),
	refreshToken: t.String(),
});

// Respuesta de /auth/login: par de tokens + usuario público (sin hash)
export const authLoginResponseSchema = t.Object({
	accessToken: t.String(),
	refreshToken: t.String(),
	user: userPublicSchema,
});

// Cambio de contraseña autenticado
export const userChangePasswordSchema = t.Object({
	currentPassword: t.String({ minLength: 1 }),
	newPassword: t.String({ minLength: 8, maxLength: 72 }),
});

// Query params para filtros: /users?role=...&isActive=...
export const userFilterQuerySchema = t.Object({
	role: t.Optional(
		t.Union([
			t.Literal("super_admin"),
			t.Literal("admin"),
			t.Literal("organizer"),
			t.Literal("referee"),
			t.Literal("statistician"),
			t.Literal("viewer_staff"),
		]),
	),
	isActive: t.Optional(t.Boolean()),
	limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
	offset: t.Optional(t.Numeric({ minimum: 0, default: 0 })),
});

// Asignar un rol a un usuario dentro de un torneo
export const addTournamentMemberSchema = t.Pick(insertTournamentMemberSchema, [
	"tournamentId",
	"userId",
	"role",
]);

// Parámetros para rutas de membresías
export const tournamentMemberRefParamsSchema = t.Object({
	memberId: t.String({ format: "uuid" }),
});
export const userRefParamsSchema = t.Object({
	userId: t.String({ format: "uuid" }),
});

// Cambiar el rol de una membresía
export const updateTournamentMemberRoleSchema = t.Pick(
	insertTournamentMemberSchema,
	["role"],
);

// Query params: /tournaments/:id/members
export const tournamentMembersFilterQuerySchema = t.Object({
	role: t.Optional(
		t.Union([
			t.Literal("organizer"),
			t.Literal("referee"),
			t.Literal("statistician"),
			t.Literal("viewer_staff"),
		]),
	),
});

// ==========================================
// 3. TIPOS TYPESCRIPT INFERIDOS
// ==========================================

export type User = Static<typeof selectUserSchema>;
export type UpdateUser = Static<typeof updateUserSchema>;
export type InsertUserRecord = Static<typeof insertUserRecordSchema>;
export type UserCreate = Static<typeof userCreateSchema>;
export type UserLogin = Static<typeof userLoginSchema>;
export type AuthRefresh = Static<typeof authRefreshSchema>;
export type AuthTokenPair = Static<typeof authTokenPairSchema>;
export type AuthLoginResponse = Static<typeof authLoginResponseSchema>;
export type UserChangePassword = Static<typeof userChangePasswordSchema>;
export type UserFilterQuery = Static<typeof userFilterQuerySchema>;
export type TournamentMember = Static<typeof selectTournamentMemberSchema>;
export type AddTournamentMember = Static<typeof addTournamentMemberSchema>;
export type UpdateTournamentMemberRole = Static<
	typeof updateTournamentMemberRoleSchema
>;

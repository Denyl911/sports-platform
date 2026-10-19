/**
 * Seed de usuario administrador para desarrollo.
 *
 * Inserta (o actualiza) un usuario con rol `admin` usando credenciales
 * de variables de entorno o valores por defecto para dev.
 *
 * Uso:
 *   bun run db:seed:admin
 *
 * Variables de entorno:
 *   ADMIN_EMAIL  (default: admin@localhost.dev)
 *   ADMIN_PASSWORD (default: admin12345)
 *   ADMIN_FULL_NAME (default: Admin)
 *
 * El script es idempotente: si el email ya existe, actualiza el rol a `admin`
 * y la contraseña.
 */
import { db } from "@sports/db";
import { users } from "@sports/db/tables";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@localhost.dev";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin12345";
const ADMIN_FULL_NAME = process.env.ADMIN_FULL_NAME ?? "Admin";

async function seedAdmin() {
	const email = ADMIN_EMAIL.toLowerCase();

	const [existing] = await db
		.select({ id: users.id, email: users.email })
		.from(users)
		.where(eq(users.email, email))
		.limit(1);

	if (existing) {
		// Actualizar rol y contraseña si ya existe
		await db
			.update(users)
			.set({
				role: "admin",
				passwordHash: await Bun.password.hash(ADMIN_PASSWORD),
				isActive: true,
			})
			.where(eq(users.id, existing.id));

		console.log(`✓ Admin actualizado: ${email} (id: ${existing.id})`);
		return;
	}

	const [created] = await db
		.insert(users)
		.values({
			email,
			passwordHash: await Bun.password.hash(ADMIN_PASSWORD),
			fullName: ADMIN_FULL_NAME,
			role: "admin",
			isActive: true,
		})
		.returning({ id: users.id, email: users.email });

	console.log(`✓ Admin creado: ${email} (id: ${created.id})`);
}

await seedAdmin();
process.exit(0);

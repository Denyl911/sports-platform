import { drizzle } from "drizzle-orm/bun-sql";
import { relations } from "./relations";

export const db = drizzle({ connection: process.env.DATABASE_URL!, relations });

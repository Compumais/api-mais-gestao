import type * as schema from "../../drizzle/schema.js";

export type Usuario = typeof schema.usuarios.$inferSelect;

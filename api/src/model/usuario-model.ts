import type * as schema from "../../drizzle/schema";

export type Usuario = typeof schema.usuarios.$inferSelect;

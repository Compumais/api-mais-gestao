import type * as schema from "../../drizzle/schema.js";

export type Entidade = typeof schema.entidade.$inferSelect;
export type NovaEntidade = typeof schema.entidade.$inferInsert;

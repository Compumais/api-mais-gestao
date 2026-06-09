import type * as schema from "@/repositories/schema";

export type Entidade = typeof schema.entidade.$inferSelect;
export type NovaEntidade = typeof schema.entidade.$inferInsert;

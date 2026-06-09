import type * as schema from "@/repositories/schema";

export type Empresa = typeof schema.empresa.$inferSelect;
export type NovaEmpresa = typeof schema.empresa.$inferInsert;
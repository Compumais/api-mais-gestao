import type { hierarquia } from "@/repositories/schema.js";

export type Hierarquia = typeof hierarquia.$inferSelect;
export type NovoHierarquia = typeof hierarquia.$inferInsert;

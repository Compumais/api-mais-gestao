import type { departamento } from "@/repositories/schema.js";

export type Departamento = typeof departamento.$inferSelect;
export type NovoDepartamento = typeof departamento.$inferInsert;

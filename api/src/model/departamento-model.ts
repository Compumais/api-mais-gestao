import type { departamento } from "@/repositories/schema";

export type Departamento = typeof departamento.$inferSelect;
export type NovoDepartamento = typeof departamento.$inferInsert;

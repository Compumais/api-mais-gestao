import type { equipamento } from "@/repositories/schema.js";

export type Equipamento = typeof equipamento.$inferSelect;
export type NovoEquipamento = typeof equipamento.$inferInsert;

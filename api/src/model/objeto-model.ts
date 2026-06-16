import type { objeto } from "@/repositories/schema.js";

export type Objeto = typeof objeto.$inferInsert;
export type NovoObjeto = typeof objeto.$inferSelect;

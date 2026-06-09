import type { objeto } from "@/repositories/schema";

export type Objeto = typeof objeto.$inferInsert;
export type NovoObjeto = typeof objeto.$inferSelect;

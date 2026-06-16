import type { tipoproblema } from "@/repositories/schema.js";

export type TipoProblema = typeof tipoproblema.$inferSelect;
export type NovoTipoProblema = typeof tipoproblema.$inferInsert;

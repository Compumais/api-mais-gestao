import type { locacao, locacaoitem } from "@/repositories/schema.js";

export type Locacao = typeof locacao.$inferSelect;
export type NovaLocacao = typeof locacao.$inferInsert;

export type LocacaoItem = typeof locacaoitem.$inferSelect;
export type NovoLocacaoItem = typeof locacaoitem.$inferInsert;

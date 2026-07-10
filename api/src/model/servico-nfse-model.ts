import type { servicosnfse } from "@/repositories/schema.js";

export type ServicoNfse = typeof servicosnfse.$inferSelect;
export type NovoServicoNfse = typeof servicosnfse.$inferInsert;

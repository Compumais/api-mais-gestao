import type { centrocusto } from "@/repositories/schema.js";

export type CentroCusto = typeof centrocusto.$inferSelect;
export type NovoCentroCusto = typeof centrocusto.$inferInsert;

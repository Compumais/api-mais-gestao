import type { centrocusto } from "@/repositories/schema";

export type CentroCusto = typeof centrocusto.$inferSelect;
export type NovoCentroCusto = typeof centrocusto.$inferInsert;

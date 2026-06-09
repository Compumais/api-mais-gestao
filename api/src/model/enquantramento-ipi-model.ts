import type { enquatramentoipi } from "@/repositories/schema";

export type EnquatramentoIPI = typeof enquatramentoipi.$inferSelect;
export type NovoEnquatramentoIPI = typeof enquatramentoipi.$inferInsert;

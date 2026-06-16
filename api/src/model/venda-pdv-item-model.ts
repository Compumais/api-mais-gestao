import type { vendapdvitem } from "@/repositories/schema.js";

export type VendaPdvItem = typeof vendapdvitem.$inferSelect;
export type NovoVendaPdvItem = typeof vendapdvitem.$inferInsert;

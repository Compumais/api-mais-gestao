import type { davitemlote } from "@/repositories/schema.js";

export type DavItemLote = typeof davitemlote.$inferSelect;
export type NovoDavItemLote = typeof davitemlote.$inferInsert;

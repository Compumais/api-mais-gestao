import type { davitem } from "@/repositories/schema.js";

export type DavItem = typeof davitem.$inferSelect;
export type NovoDavItem = typeof davitem.$inferInsert;

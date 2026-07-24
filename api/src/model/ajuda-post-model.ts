import type { ajudaposts } from "@/repositories/schema.js";

export type AjudaPost = typeof ajudaposts.$inferSelect;
export type NovoAjudaPost = typeof ajudaposts.$inferInsert;

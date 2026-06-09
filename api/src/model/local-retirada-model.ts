import type { localretirada } from "@/repositories/schema";

export type LocalRetirada = typeof localretirada.$inferSelect;
export type NovoLocalRetirada = typeof localretirada.$inferInsert;

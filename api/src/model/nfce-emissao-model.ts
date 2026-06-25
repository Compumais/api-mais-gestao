import type { nfceconfiguracao } from "@/repositories/schema.js";

export type NfceConfiguracao = typeof nfceconfiguracao.$inferSelect;
export type NovaNfceConfiguracao = typeof nfceconfiguracao.$inferInsert;

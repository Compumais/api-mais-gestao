import type * as schema from "@/repositories/schema.js";

export type Auditoria = typeof schema.auditLogs.$inferSelect;
export type NovaAuditoria = typeof schema.auditLogs.$inferInsert;

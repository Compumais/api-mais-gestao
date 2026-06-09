import type * as schema from "@/repositories/schema";

export type Auditoria = typeof schema.auditLogs.$inferSelect;
export type NovaAuditoria = typeof schema.auditLogs.$inferInsert;

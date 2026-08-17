import type { vendapdvpagamento } from "@/repositories/schema.js";

export type VendaPdvPagamento = typeof vendapdvpagamento.$inferSelect;
export type NovoVendaPdvPagamento = typeof vendapdvpagamento.$inferInsert;

export type MeioPagamentoPdv = "DINHEIRO" | "PIX" | "CARTAO";
export type StatusLancamentoPagamento = "ok" | "pendente" | "cancelado";

export type LancamentoPagamentoPdv = {
	meio: MeioPagamentoPdv;
	valor: number;
	nsu?: string | null;
	autorizacao?: string | null;
	bandeira?: string | null;
	status?: StatusLancamentoPagamento;
};

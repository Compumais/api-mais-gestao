import type { atalhopdv } from "@/repositories/schema.js";

export type AtalhoPdv = typeof atalhopdv.$inferSelect;
export type NovoAtalhoPdv = typeof atalhopdv.$inferInsert;

export type AtalhoPdvComProduto = {
	idproduto: string;
	descricao: string;
	preco: string | null;
	unidademedida: string | null;
	idunidademedida: string | null;
	codigo: number | null;
	ordem: number;
};

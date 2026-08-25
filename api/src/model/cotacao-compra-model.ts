import type * as schema from "@/repositories/schema.js";

export type CotacaoCompra = typeof schema.cotacaocompra.$inferSelect;
export type NovaCotacaoCompra = typeof schema.cotacaocompra.$inferInsert;
export type CotacaoCompraItem = typeof schema.cotacaocompraitem.$inferSelect;
export type NovoCotacaoCompraItem = typeof schema.cotacaocompraitem.$inferInsert;
export type CotacaoCompraProposta =
	typeof schema.cotacaocompraproposta.$inferSelect;
export type NovaCotacaoCompraProposta =
	typeof schema.cotacaocompraproposta.$inferInsert;
export type CotacaoCompraPropostaItem =
	typeof schema.cotacaocomprapropostaitem.$inferSelect;
export type NovoCotacaoCompraPropostaItem =
	typeof schema.cotacaocomprapropostaitem.$inferInsert;

export const STATUS_COTACAO_COMPRA = {
	RASCUNHO: "R",
	ABERTA: "A",
	ENCERRADA: "E",
	CANCELADA: "C",
} as const;

export type CotacaoCompraItemEnriquecido = CotacaoCompraItem & {
	codigoproduto: number | null;
	nomeproduto: string | null;
	descricaoproduto: string | null;
};

export type CotacaoCompraCompleta = CotacaoCompra & {
	itens: CotacaoCompraItemEnriquecido[];
	totalpropostas: number;
};

export type CotacaoCompraListagem = CotacaoCompra & {
	totalpropostas: number;
};

export type CotacaoCompraPublicaItem = {
	id: string;
	idproduto: string | null;
	descricao: string | null;
	quantidade: string;
	unidademedida: string | null;
	observacao: string | null;
	ordem: number;
	codigoproduto: number | null;
	nomeproduto: string | null;
	descricaoproduto: string | null;
};

export type CotacaoCompraPublica = {
	id: string;
	titulo: string;
	observacao: string | null;
	validade: string | null;
	itens: CotacaoCompraPublicaItem[];
};

export type ComparativoPropostaItem = {
	idproposta: string;
	nome: string;
	telefone: string;
	precounitario: number;
	menorpreco: boolean;
};

export type ComparativoItem = {
	idcotacaoitem: string;
	idproduto: string | null;
	descricao: string | null;
	codigoproduto: number | null;
	nomeproduto: string | null;
	quantidade: string;
	unidademedida: string | null;
	propostas: ComparativoPropostaItem[];
};

export type ComparativoCotacao = {
	cotacao: CotacaoCompra;
	itens: ComparativoItem[];
};

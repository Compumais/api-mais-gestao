import type { CardapioPublicoProduto } from "@/services/cardapio-publico.service";

export type ItemSacola = {
	chave: string;
	idproduto: string;
	idprodutomeio: string | null;
	nome: string;
	preco: number;
	quantidade: number;
	observacao: string;
};

export type PedidoSucesso = {
	protocolo: string;
	total: number;
	pixCopiaCola: string | null;
	chavepix: string | null;
};

export function formatarMoeda(valor: number) {
	return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function precoPizza(a: number, b: number) {
	return Math.max(a, b);
}

export type { CardapioPublicoProduto };

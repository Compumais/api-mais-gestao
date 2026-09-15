import {
	largurasLinhaCupom,
	normalizarTamanhoFonte,
	type TamanhoFonteImpressao,
} from "./fonte-impressao";

/**
 * Quebra texto na largura do cupom térmico: preferência por espaços;
 * se a palavra for maior que a largura, corta por caracteres.
 */
export function quebrarTextoCupom(texto: string, largura: number): string[] {
	const limpo = texto.replace(/\s+/g, " ").trim();
	if (!limpo) return [""];
	const max = Math.max(1, Math.floor(largura));
	const linhas: string[] = [];
	let resto = limpo;
	while (resto.length > max) {
		let corte = resto.lastIndexOf(" ", max);
		if (corte <= 0) corte = max;
		linhas.push(resto.slice(0, corte).trimEnd());
		resto = resto.slice(corte).trimStart();
	}
	if (resto) linhas.push(resto);
	return linhas;
}

/** Prefixo na 1ª linha; continuações alinhadas com o mesmo indent. */
export function linhasComPrefixo(
	prefixo: string,
	texto: string,
	larguraLinha: number,
): string[] {
	const indent = " ".repeat(prefixo.length);
	const larguraConteudo = Math.max(1, larguraLinha - prefixo.length);
	const partes = quebrarTextoCupom(texto, larguraConteudo);
	return partes.map((parte, i) =>
		i === 0 ? `${prefixo}${parte}` : `${indent}${parte}`,
	);
}

function formatarQtd(n: number): string {
	const arred = Math.round(n * 1000) / 1000;
	if (Number.isInteger(arred)) return String(arred);
	return arred.toFixed(3).replace(".", ",");
}

export type FormatoItemProducao = "quantidade" | "unitario";

export function normalizarFormatoItemProducao(
	valor: string | null | undefined,
): FormatoItemProducao {
	return valor === "unitario" ? "unitario" : "quantidade";
}

/** Inteiro ≥ 2 vira N linhas de 1; fração ou 1 permanece numa linha. */
export function expandirItensFormatoProducao<T extends { quantidade: number }>(
	itens: T[],
	formato: FormatoItemProducao,
): T[] {
	if (formato !== "unitario") {
		return itens;
	}
	const saida: T[] = [];
	for (const item of itens) {
		const arred = Math.round(item.quantidade * 1000) / 1000;
		if (!Number.isInteger(arred) || arred <= 1) {
			saida.push(item);
			continue;
		}
		const vezes = Math.min(arred, 200);
		for (let i = 0; i < vezes; i++) {
			saida.push({ ...item, quantidade: 1 });
		}
	}
	return saida;
}

export type ItemPedidoProducaoLayout = {
	quantidade: number;
	descricao: string;
	observacao?: string | null;
	nomeGrupo?: string | null;
};

export function montarLinhasPedidoProducao(params: {
	origem: string;
	cliente?: string | null;
	observacaoPedido?: string | null;
	itens: ItemPedidoProducaoLayout[];
	reimpressao?: boolean;
	agruparPorGrupo?: boolean;
	formatoItem?: FormatoItemProducao;
	tamanhoFonte?: TamanhoFonteImpressao;
	/** Relógio injetável para testes. */
	agora?: Date;
}): string[] {
	const tamanhoFonte = normalizarTamanhoFonte(params.tamanhoFonte);
	const { linha: larguraLinha } = largurasLinhaCupom(tamanhoFonte);
	const agora = params.agora ?? new Date();

	const linhas: string[] = [];
	linhas.push("================================");
	linhas.push("     PEDIDO DE PRODUCAO");
	if (params.reimpressao) {
		linhas.push("     *** REIMPRESSAO ***");
	}
	linhas.push("================================");
	linhas.push(params.origem);
	if (params.cliente?.trim()) {
		linhas.push(`Cliente: ${params.cliente.trim()}`);
	}
	linhas.push(`Hora: ${agora.toLocaleString("pt-BR")}`);
	if (params.observacaoPedido?.trim()) {
		linhas.push("--------------------------------");
		linhas.push("Obs pedido:");
		linhas.push(
			...quebrarTextoCupom(params.observacaoPedido.trim(), larguraLinha),
		);
	}
	linhas.push("--------------------------------");

	const itens = expandirItensFormatoProducao(
		params.itens,
		normalizarFormatoItemProducao(params.formatoItem),
	);

	const emitirItem = (item: ItemPedidoProducaoLayout) => {
		const prefixo = `${formatarQtd(item.quantidade)}  `;
		linhas.push(
			...linhasComPrefixo(prefixo, item.descricao ?? "", larguraLinha),
		);
		if (item.observacao?.trim()) {
			linhas.push(
				...linhasComPrefixo("   Obs: ", item.observacao.trim(), larguraLinha),
			);
		}
	};

	if (params.agruparPorGrupo) {
		let grupoAtual: string | null = null;
		for (const item of itens) {
			const grupo = item.nomeGrupo?.trim() || "OUTROS";
			if (grupo !== grupoAtual) {
				if (grupoAtual !== null) {
					linhas.push("--------------------------------");
				}
				linhas.push(
					...linhasComPrefixo(">> ", grupo.toUpperCase(), larguraLinha),
				);
				grupoAtual = grupo;
			}
			emitirItem(item);
		}
	} else {
		for (const item of itens) {
			emitirItem(item);
		}
	}

	linhas.push("================================");
	linhas.push("\n\n\n");
	return linhas;
}

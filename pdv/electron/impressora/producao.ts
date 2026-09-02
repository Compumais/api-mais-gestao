import { getConfig, queryOne } from "../db/database";
import { obterDestinoGrupoGourmet } from "../db/repos";
import { chaveDestino, type DestinoImpressora, destinoPronto } from "./destino";
import { imprimirPedidoProducao } from "./escpos";

export type ItemProducao = {
	idproduto: string;
	descricao: string;
	quantidade: number;
	observacao?: string | null;
	/** Nome do grupo para cabeçalho no cupom único (modo pedido). */
	nomeGrupo?: string | null;
};

export type ModoImpressaoProducao = "itens" | "pedido";

export type CupomProducao = {
	destino: DestinoImpressora;
	itens: ItemProducao[];
};

export type ProdutoProducaoInfo = {
	idgrupogourmet: string | null;
	idgrupo: string | null;
	descricao: string;
	nomeGrupogourmet: string | null;
	nomeGrupo: string | null;
};

export function normalizarModoImpressaoProducao(
	valor: string | null | undefined,
): ModoImpressaoProducao {
	return valor === "pedido" ? "pedido" : "itens";
}

/** Default habilitado (`"1"` / ausente): imprime cabeçalho do grupo no cupom único. */
export function normalizarImprimirGrupoProducao(
	valor: string | null | undefined,
): boolean {
	return valor !== "0";
}

/** Cabeçalho do grupo só no modo pedido e quando a flag estiver habilitada. */
export function deveAgruparPorGrupoProducao(
	modo: ModoImpressaoProducao,
	imprimirGrupo: boolean,
): boolean {
	return modo === "pedido" && imprimirGrupo;
}

export function agruparLinhasPedidoFila<
	T extends { client_order_id: string; criadoem: string },
>(linhas: T[]): T[][] {
	const grupos = new Map<string, T[]>();
	for (const linha of linhas) {
		const atual = grupos.get(linha.client_order_id) ?? [];
		atual.push(linha);
		grupos.set(linha.client_order_id, atual);
	}
	return [...grupos.values()].sort((a, b) =>
		(a[0]?.criadoem ?? "") < (b[0]?.criadoem ?? "") ? 1 : -1,
	);
}

/** Preferência: grupo gourmet; senão grupo comum. */
export function nomeGrupoProducao(
	produto: Pick<
		ProdutoProducaoInfo,
		"nomeGrupogourmet" | "nomeGrupo" | "idgrupogourmet" | "idgrupo"
	> | null,
): string | null {
	const gourmet =
		produto?.nomeGrupogourmet?.trim() || produto?.idgrupogourmet?.trim();
	if (gourmet) {
		return gourmet;
	}
	const grupo = produto?.nomeGrupo?.trim() || produto?.idgrupo?.trim();
	return grupo || null;
}

/**
 * Ordena itens por nome de grupo (OUTROS por último), preservando ordem relativa
 * dentro de cada grupo. Usado no cupom único (modo pedido).
 */
export function ordenarItensPorGrupo(itens: ItemProducao[]): ItemProducao[] {
	const chave = (item: ItemProducao) => item.nomeGrupo?.trim() || "OUTROS";
	const ordemPrimeira = new Map<string, number>();
	itens.forEach((item, idx) => {
		const k = chave(item);
		if (!ordemPrimeira.has(k)) {
			ordemPrimeira.set(k, idx);
		}
	});
	return [...itens].sort((a, b) => {
		const ka = chave(a);
		const kb = chave(b);
		const aOutros = ka === "OUTROS" ? 1 : 0;
		const bOutros = kb === "OUTROS" ? 1 : 0;
		if (aOutros !== bOutros) {
			return aOutros - bOutros;
		}
		if (ka !== kb) {
			const cmp = ka.localeCompare(kb, "pt-BR", { sensitivity: "base" });
			if (cmp !== 0) {
				return cmp;
			}
			return (ordemPrimeira.get(ka) ?? 0) - (ordemPrimeira.get(kb) ?? 0);
		}
		return 0;
	});
}

export async function rotuloOrigemMesa(numero: number): Promise<string> {
	const modelo = await getConfig("modelo_atendimento", "mesa");
	const nome = modelo === "comanda" ? "Comanda" : "Mesa";
	return `${nome} ${numero}`;
}

export async function montarCuponsProducao(params: {
	modo: ModoImpressaoProducao;
	itens: ItemProducao[];
	destinoPedido: DestinoImpressora | null;
	resolverProduto: (idproduto: string) => Promise<ProdutoProducaoInfo | null>;
	resolverDestinoGrupo: (idGrupo: string) => Promise<DestinoImpressora | null>;
}): Promise<CupomProducao[]> {
	const enriquecidos: ItemProducao[] = [];
	const porDestino = new Map<string, CupomProducao>();

	for (const item of params.itens) {
		const produto = await params.resolverProduto(item.idproduto);
		const linha: ItemProducao = {
			...item,
			descricao: item.descricao?.trim() || produto?.descricao || "",
		};
		if (params.modo === "pedido") {
			enriquecidos.push({
				...linha,
				nomeGrupo: nomeGrupoProducao(produto),
			});
			continue;
		}
		const idGrupo = produto?.idgrupogourmet?.trim();
		if (!idGrupo) {
			continue;
		}
		const destino = await params.resolverDestinoGrupo(idGrupo);
		if (!destino) {
			continue;
		}
		const chave = chaveDestino(destino);
		const atual = porDestino.get(chave);
		if (atual) {
			atual.itens.push(linha);
		} else {
			porDestino.set(chave, { destino, itens: [linha] });
		}
	}

	if (params.modo === "pedido") {
		if (!enriquecidos.length || !params.destinoPedido) {
			return [];
		}
		return [
			{
				destino: params.destinoPedido,
				itens: ordenarItensPorGrupo(enriquecidos),
			},
		];
	}
	return [...porDestino.values()];
}

async function resolverProduto(
	idproduto: string,
): Promise<ProdutoProducaoInfo | null> {
	const row = await queryOne<{
		idgrupogourmet: string | null;
		idgrupo: string | null;
		descricao: string;
		nome_grupogourmet: string | null;
		nome_grupo: string | null;
	}>(
		`SELECT p.idgrupogourmet, p.idgrupo, p.descricao,
			gg.nome AS nome_grupogourmet,
			g.nome AS nome_grupo
		 FROM produto_cache p
		 LEFT JOIN grupo_gourmet gg ON gg.id = p.idgrupogourmet
		 LEFT JOIN grupo g ON g.id = p.idgrupo
		 WHERE p.id = $1`,
		[idproduto],
	);
	if (!row) {
		return null;
	}
	return {
		idgrupogourmet: row.idgrupogourmet,
		idgrupo: row.idgrupo,
		descricao: row.descricao,
		nomeGrupogourmet: row.nome_grupogourmet,
		nomeGrupo: row.nome_grupo,
	};
}

async function destinoConfiguradoPedido(): Promise<DestinoImpressora | null> {
	const tipoRaw = await getConfig("impressora_pedido_tipo", "");
	if (tipoRaw !== "sistema" && tipoRaw !== "rede") {
		return null;
	}
	const destino: DestinoImpressora = {
		tipo: tipoRaw,
		nome: await getConfig("impressora_pedido_nome", ""),
		host: await getConfig("impressora_pedido_host", ""),
		porta: Number(await getConfig("impressora_pedido_porta", "9100")) || 9100,
	};
	return destinoPronto(destino) ? destino : null;
}

async function primeiroDestinoDosItens(
	itens: ItemProducao[],
): Promise<DestinoImpressora | null> {
	for (const item of itens) {
		const produto = await resolverProduto(item.idproduto);
		const idGrupo = produto?.idgrupogourmet?.trim();
		if (!idGrupo) {
			continue;
		}
		const destino = await obterDestinoGrupoGourmet(idGrupo);
		if (destino) {
			return destino;
		}
	}
	return null;
}

async function resolverDestinoPedido(
	itens: ItemProducao[],
): Promise<DestinoImpressora | null> {
	return (
		(await destinoConfiguradoPedido()) ?? (await primeiroDestinoDosItens(itens))
	);
}

/** Agrupa itens por destino mapeado (modo itens) ou emite um cupom único (modo pedido). Nunca lança. */
export async function imprimirProducaoPedido(params: {
	origem: string;
	cliente?: string | null;
	observacaoPedido?: string | null;
	itens: ItemProducao[];
	reimpressao?: boolean;
}): Promise<void> {
	try {
		const modo = normalizarModoImpressaoProducao(
			await getConfig("impressao_producao_modo", "itens"),
		);
		const imprimirGrupo = normalizarImprimirGrupoProducao(
			await getConfig("impressao_producao_imprimir_grupo", "1"),
		);
		const cupons = await montarCuponsProducao({
			modo,
			itens: params.itens,
			destinoPedido:
				modo === "pedido" ? await resolverDestinoPedido(params.itens) : null,
			resolverProduto,
			resolverDestinoGrupo: obterDestinoGrupoGourmet,
		});
		const cupomUnico = modo === "pedido";
		const agruparPorGrupo = deveAgruparPorGrupoProducao(modo, imprimirGrupo);
		for (const { destino, itens } of cupons) {
			await imprimirPedidoProducao({
				destino,
				origem: params.origem,
				cliente: params.cliente,
				observacaoPedido: params.observacaoPedido,
				itens,
				reimpressao: params.reimpressao,
				agruparPorGrupo,
				fonteMenor: cupomUnico,
			});
		}
	} catch {
		// produção não pode falhar o pedido
	}
}

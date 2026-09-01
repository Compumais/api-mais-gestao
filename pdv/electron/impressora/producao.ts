import { getConfig, queryOne } from "../db/database";
import { obterDestinoGrupoGourmet } from "../db/repos";
import { chaveDestino, type DestinoImpressora, destinoPronto } from "./destino";
import { imprimirPedidoProducao } from "./escpos";

export type ItemProducao = {
	idproduto: string;
	descricao: string;
	quantidade: number;
	observacao?: string | null;
};

export type ModoImpressaoProducao = "itens" | "pedido";

export type CupomProducao = {
	destino: DestinoImpressora;
	itens: ItemProducao[];
};

export function normalizarModoImpressaoProducao(
	valor: string | null | undefined,
): ModoImpressaoProducao {
	return valor === "pedido" ? "pedido" : "itens";
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

export async function rotuloOrigemMesa(numero: number): Promise<string> {
	const modelo = await getConfig("modelo_atendimento", "mesa");
	const nome = modelo === "comanda" ? "Comanda" : "Mesa";
	return `${nome} ${numero}`;
}

export async function montarCuponsProducao(params: {
	modo: ModoImpressaoProducao;
	itens: ItemProducao[];
	destinoPedido: DestinoImpressora | null;
	resolverProduto: (
		idproduto: string,
	) => Promise<{ idgrupogourmet: string | null; descricao: string } | null>;
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
			enriquecidos.push(linha);
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
		return [{ destino: params.destinoPedido, itens: enriquecidos }];
	}
	return [...porDestino.values()];
}

async function resolverProduto(idproduto: string): Promise<{
	idgrupogourmet: string | null;
	descricao: string;
} | null> {
	return (
		(await queryOne<{
			idgrupogourmet: string | null;
			descricao: string;
		}>("SELECT idgrupogourmet, descricao FROM produto_cache WHERE id = $1", [
			idproduto,
		])) ?? null
	);
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
	itens: ItemProducao[];
	reimpressao?: boolean;
}): Promise<void> {
	try {
		const modo = normalizarModoImpressaoProducao(
			await getConfig("impressao_producao_modo", "itens"),
		);
		const cupons = await montarCuponsProducao({
			modo,
			itens: params.itens,
			destinoPedido:
				modo === "pedido" ? await resolverDestinoPedido(params.itens) : null,
			resolverProduto,
			resolverDestinoGrupo: obterDestinoGrupoGourmet,
		});
		for (const { destino, itens } of cupons) {
			await imprimirPedidoProducao({
				destino,
				origem: params.origem,
				cliente: params.cliente,
				itens,
				reimpressao: params.reimpressao,
			});
		}
	} catch {
		// produção não pode falhar o pedido
	}
}

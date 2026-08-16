import { getConfig, queryOne } from "../db/database";
import { imprimirPedidoProducao } from "./escpos";

export type ItemProducao = {
	idproduto: string;
	descricao: string;
	quantidade: number;
	observacao?: string | null;
};

export async function rotuloOrigemMesa(numero: number): Promise<string> {
	const modelo = await getConfig("modelo_atendimento", "mesa");
	const nome = modelo === "comanda" ? "Comanda" : "Mesa";
	return `${nome} ${numero}`;
}

/** Agrupa itens por impressora mapeada. Sem grupo ou sem impressora: ignora. Nunca lança. */
export async function imprimirProducaoPedido(params: {
	origem: string;
	cliente?: string | null;
	itens: ItemProducao[];
}): Promise<void> {
	try {
		const porImpressora = new Map<string, ItemProducao[]>();
		for (const item of params.itens) {
			const produto = await queryOne<{
				idgrupogourmet: string | null;
				descricao: string;
			}>("SELECT idgrupogourmet, descricao FROM produto_cache WHERE id = $1", [
				item.idproduto,
			]);
			const idGrupo = produto?.idgrupogourmet?.trim();
			if (!idGrupo) {
				continue;
			}
			const mapa = await queryOne<{ impressora_nome: string }>(
				"SELECT impressora_nome FROM impressora_grupo_gourmet WHERE idgrupogourmet = $1",
				[idGrupo],
			);
			const impressora = mapa?.impressora_nome?.trim();
			if (!impressora) {
				continue;
			}
			const lista = porImpressora.get(impressora) ?? [];
			lista.push({
				...item,
				descricao: produto?.descricao ?? item.descricao,
			});
			porImpressora.set(impressora, lista);
		}
		for (const [deviceName, itens] of porImpressora) {
			await imprimirPedidoProducao({
				deviceName,
				origem: params.origem,
				cliente: params.cliente,
				itens,
			});
		}
	} catch {
		// produção não pode falhar o pedido
	}
}

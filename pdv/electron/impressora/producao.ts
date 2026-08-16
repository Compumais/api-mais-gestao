import { getConfig, queryOne } from "../db/database";
import { obterDestinoGrupoGourmet } from "../db/repos";
import { chaveDestino, type DestinoImpressora } from "./destino";
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

/** Agrupa itens por destino mapeado. Sem grupo ou sem impressora: ignora. Nunca lança. */
export async function imprimirProducaoPedido(params: {
	origem: string;
	cliente?: string | null;
	itens: ItemProducao[];
}): Promise<void> {
	try {
		const porDestino = new Map<
			string,
			{ destino: DestinoImpressora; itens: ItemProducao[] }
		>();
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
			const destino = await obterDestinoGrupoGourmet(idGrupo);
			if (!destino) {
				continue;
			}
			const chave = chaveDestino(destino);
			const atual = porDestino.get(chave);
			const linha = {
				...item,
				// Meio a meio: usa a descrição combinada do item; senão o nome do cadastro.
				descricao: item.descricao?.trim() || produto?.descricao || "",
			};
			if (atual) {
				atual.itens.push(linha);
			} else {
				porDestino.set(chave, { destino, itens: [linha] });
			}
		}
		for (const { destino, itens } of porDestino.values()) {
			await imprimirPedidoProducao({
				destino,
				origem: params.origem,
				cliente: params.cliente,
				itens,
			});
		}
	} catch {
		// produção não pode falhar o pedido
	}
}

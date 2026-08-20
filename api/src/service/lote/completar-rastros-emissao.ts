import { buscarCfopPorCodigo } from "@/repositories/cfop-repositories.js";
import { buscarLotePorId } from "@/repositories/lote-repositories.js";
import { buscarProdutoPorId } from "@/repositories/produtos-repositories.js";
import { resolverLotesFefo } from "@/service/lote/resolver-lotes-fefo.js";
import type { ItemPayloadNfe } from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import { validarRastrosItemEmissao } from "@/util/validar-lotes-item-emissao-nfe.js";

function hojeIso(dataReferencia?: string): string {
	return (dataReferencia ?? new Date().toISOString()).slice(0, 10);
}

function rastroVencido(dVal: string | undefined, hoje: string): boolean {
	if (!dVal) return false;
	return dVal.slice(0, 10) < hoje;
}

export async function completarRastrosItensEmissao(params: {
	idempresa: string;
	itens: ItemPayloadNfe[];
	dataReferencia?: string | undefined;
}): Promise<{ itens: ItemPayloadNfe[]; pendencias: string[] }> {
	const hoje = hojeIso(params.dataReferencia);
	const pendencias: string[] = [];
	const itens: ItemPayloadNfe[] = [];

	for (const [index, item] of params.itens.entries()) {
		if (!item.idproduto) {
			itens.push(item);
			continue;
		}

		const produto = await buscarProdutoPorId(item.idproduto);
		if (produto?.controlalote !== 1) {
			itens.push({ ...item, rastros: undefined });
			continue;
		}

		const cfop = item.cfop
			? await buscarCfopPorCodigo(params.idempresa, item.cfop)
			: null;
		const permitirVencido = cfop?.permitirbaixarlotevencido === 1;

		let rastros = item.rastros ?? [];
		let quantidadeFaltanteFefo = 0;
		let saldoOrfao = 0;

		if (rastros.length === 0) {
			const fefo = await resolverLotesFefo({
				idempresa: params.idempresa,
				idproduto: item.idproduto,
				quantidade: item.quantidade,
				idcfop: cfop?.id,
				dataReferencia: hoje,
				tipoSaldo: "ambos",
			});
			rastros = fefo.lotes.map((lote) => ({
				idlote: lote.idlote,
				nLote: lote.numero,
				qLote: lote.quantidade,
				dFab: lote.datafabricacao ?? undefined,
				dVal: lote.datavalidade ?? undefined,
				cAgreg: lote.codigoagregacao ?? undefined,
			}));
			quantidadeFaltanteFefo = fefo.quantidadeFaltante;
			saldoOrfao = fefo.saldoOrfao;
		} else {
			for (const rastro of rastros) {
				let validade = rastro.dVal;
				if (rastro.idlote && !validade) {
					const cadastro = await buscarLotePorId(rastro.idlote);
					validade = cadastro?.datavalidade ?? undefined;
				}
				if (!permitirVencido && rastroVencido(validade, hoje)) {
					pendencias.push(
						`Item ${index + 1}: lote ${rastro.nLote} vencido. Use um CFOP que permita baixa de lote vencido.`,
					);
				}
			}
		}

		const erro = validarRastrosItemEmissao({
			index,
			controlaLote: true,
			quantidadeItem: item.quantidade,
			rastros,
			quantidadeFaltanteFefo,
			saldoOrfao,
		});
		if (erro) {
			pendencias.push(erro);
		}

		itens.push({ ...item, rastros });
	}

	return { itens, pendencias };
}

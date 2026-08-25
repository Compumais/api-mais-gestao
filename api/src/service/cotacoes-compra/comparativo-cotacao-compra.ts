import type { ComparativoCotacao } from "@/model/cotacao-compra-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	buscarCotacaoCompraPorId,
	listarItensCotacaoCompraEnriquecidos,
	listarItensPropostasCotacao,
	listarPropostasCotacao,
} from "@/repositories/cotacao-compra-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { httpNaoEncontrado, httpOk, httpProibido } from "@/util/http-util.js";

export async function comparativoCotacaoCompraService({
	id,
	idusuario,
}: {
	id: string;
	idusuario: string;
}): Promise<HttpResponse<ComparativoCotacao>> {
	const cotacao = await buscarCotacaoCompraPorId(id);
	if (!cotacao) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		cotacao.idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const [itens, propostas, precos] = await Promise.all([
		listarItensCotacaoCompraEnriquecidos(id),
		listarPropostasCotacao(id),
		listarItensPropostasCotacao(id),
	]);

	const propostasPorId = new Map(propostas.map((p) => [p.id, p]));
	const precosPorItem = new Map<string, typeof precos>();
	for (const preco of precos) {
		const lista = precosPorItem.get(preco.idcotacaoitem) ?? [];
		lista.push(preco);
		precosPorItem.set(preco.idcotacaoitem, lista);
	}

	return httpOk<ComparativoCotacao>({
		cotacao,
		itens: itens.map((item) => {
			const propostasItem = (precosPorItem.get(item.id) ?? [])
				.map((preco) => {
					const proposta = propostasPorId.get(preco.idproposta);
					return {
						idproposta: preco.idproposta,
						nome: proposta?.nome ?? "",
						telefone: proposta?.telefone ?? "",
						precounitario: Number(preco.precounitario),
						menorpreco: false,
					};
				})
				.sort((a, b) => a.precounitario - b.precounitario);

			const menor = propostasItem[0]?.precounitario;
			for (const proposta of propostasItem) {
				proposta.menorpreco =
					menor !== undefined && proposta.precounitario === menor;
			}

			return {
				idcotacaoitem: item.id,
				idproduto: item.idproduto,
				descricao: item.descricao,
				codigoproduto: item.codigoproduto,
				nomeproduto: item.nomeproduto,
				quantidade: item.quantidade,
				unidademedida: item.unidademedida,
				propostas: propostasItem,
			};
		}),
	});
}

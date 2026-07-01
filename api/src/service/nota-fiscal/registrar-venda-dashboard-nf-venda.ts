import { v4 as uuidv4 } from "uuid";
import type { NotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import type { NotaFiscal } from "@/model/nota-fiscal-model.js";
import { buscarTipoDocumentoFinanceiroPorId } from "@/repositories/tipo-documento-financeiro-repositories.js";
import {
	buscarVendaPdvGourmetPorNotaFiscalNfce,
	criarVendaPdvGourmetComItens,
} from "@/repositories/venda-pdv-gourmet-repositories.js";
import { FIN_NFE_DEVOLUCAO } from "@/util/cfop-devolucao-emissao-nfe.js";
import type { DadosEmissaoNfeSalvos } from "@/util/dados-emissao-nfe-nota.js";
import {
	acumularPagamentoPorTPag,
	criarPagamentosVendaPdvZerados,
	NUMERO_PDV_NOTA_FISCAL,
} from "@/util/mapear-pagamento-nf-venda-pdv.js";
import { parseValorMonetario } from "@/util/recebimentos-venda-util.js";

export type RegistrarVendaDashboardNfVendaParametros = {
	nota: NotaFiscal;
	itens: NotaFiscalItem[];
	emissaoSalva?: DadosEmissaoNfeSalvos | undefined;
	idusuario: string;
};

export type ResultadoRegistrarVendaDashboardNfVenda = {
	idvenda: string | null;
	criada: boolean;
	avisos: string[];
};

async function resolverPagamentosVendaPdv(
	emissaoSalva: DadosEmissaoNfeSalvos | undefined,
	valorTotal: number,
): Promise<ReturnType<typeof criarPagamentosVendaPdvZerados>> {
	let pagamentos = criarPagamentosVendaPdvZerados(valorTotal);

	const formas = emissaoSalva?.formasPagamento;
	if (formas && formas.length > 0) {
		for (const forma of formas) {
			const tipoDoc = await buscarTipoDocumentoFinanceiroPorId(
				forma.idtipodocumentofinanceiro,
			);
			const tPag =
				tipoDoc?.formapagamentonfe?.trim() ||
				emissaoSalva?.formaPagamento ||
				"01";
			pagamentos = acumularPagamentoPorTPag(pagamentos, tPag, forma.valor);
		}
		return pagamentos;
	}

	const tPag = emissaoSalva?.formaPagamento ?? "01";
	if (tPag !== "90" && valorTotal > 0) {
		pagamentos = acumularPagamentoPorTPag(pagamentos, tPag, valorTotal);
	}

	return pagamentos;
}

function montarItensVendaPdv(
	idvenda: string,
	idempresa: string,
	itens: NotaFiscalItem[],
) {
	return itens
		.filter((item) => item.idproduto)
		.map((item) => {
			const quantidade = item.quantidade ?? "0";
			const precounitario = item.precounitario ?? "0";
			const qty = parseValorMonetario(quantidade);
			const preco = parseValorMonetario(precounitario);
			const precototal =
				item.total ?? (qty > 0 && preco > 0 ? (qty * preco).toFixed(2) : "0");

			return {
				id: uuidv4(),
				idempresa,
				idvenda,
				idproduto: item.idproduto as string,
				quantidade,
				precounitario,
				precototal,
				precopromocao: "0",
				precoalterado: "0",
				taxaservico: 0,
			};
		});
}

export async function registrarVendaDashboardNfVenda({
	nota,
	itens,
	emissaoSalva,
	idusuario,
}: RegistrarVendaDashboardNfVendaParametros): Promise<ResultadoRegistrarVendaDashboardNfVenda> {
	const avisos: string[] = [];

	if (nota.modelo !== "55") {
		return { idvenda: null, criada: false, avisos };
	}

	if (nota.finalidadeemissaonfe === FIN_NFE_DEVOLUCAO) {
		return { idvenda: null, criada: false, avisos };
	}

	const vendaExistente = await buscarVendaPdvGourmetPorNotaFiscalNfce(nota.id);
	if (vendaExistente) {
		return { idvenda: vendaExistente.id, criada: false, avisos };
	}

	const valorTotal = parseValorMonetario(nota.valortotalnota);
	if (valorTotal <= 0) {
		avisos.push("NF sem valor total para registrar venda no dashboard");
		return { idvenda: null, criada: false, avisos };
	}

	const pagamentos = await resolverPagamentosVendaPdv(emissaoSalva, valorTotal);
	const idvenda = uuidv4();
	const dataVenda =
		nota.datahoraemissao ?? nota.emissao ?? new Date().toISOString();
	const itensVenda = montarItensVendaPdv(idvenda, nota.idempresa, itens);

	try {
		await criarVendaPdvGourmetComItens(
			{
				id: idvenda,
				idempresa: nota.idempresa,
				numeropdv: NUMERO_PDV_NOTA_FISCAL,
				usuarioquefechouvenda: idusuario,
				vendalocal: 0,
				deveemitirnfce: false,
				idnotafiscalnfce: nota.id,
				datacriacao: dataVenda,
				dataalteracao: dataVenda,
				...pagamentos,
			},
			itensVenda,
		);
	} catch (erro) {
		console.error("Erro ao registrar venda do dashboard para NF venda:", erro);
		avisos.push("Falha ao registrar venda no dashboard");
		return { idvenda: null, criada: false, avisos };
	}

	return { idvenda, criada: true, avisos };
}

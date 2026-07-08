import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	buscarNotaFiscalPorId,
	listarItensPorNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import {
	emitirNfeVendaService,
	type ResultadoEmissaoNfeVenda,
} from "@/service/nfe-emissao/emitir-nfe-venda.js";
import { mapearItensNotaParaEmissao } from "@/service/nfe-emissao/mapear-itens-nota-para-emissao.js";
import {
	FIN_NFE_DEVOLUCAO,
	resolverTipoDevolucaoEmissao,
} from "@/util/cfop-devolucao-emissao-nfe.js";
import { extrairDadosEmissaoNfeSalvos } from "@/util/dados-emissao-nfe-nota.js";
import {
	httpBadRequest,
	httpNaoEncontrado,
	httpProibido,
} from "@/util/http-util.js";
import { NFE_STATUS } from "@/util/nfe-status.js";
import { normalizarPagamentoEmissaoNfe } from "@/util/normalizar-pagamento-emissao-nfe.js";

type TransmitirNfeVendaParametros = {
	idusuario: string;
	idnotafiscal: string;
	confirmarProducao?: boolean;
};

export async function transmitirNfeVendaService({
	idusuario,
	idnotafiscal,
	confirmarProducao = false,
}: TransmitirNfeVendaParametros): Promise<
	HttpResponse<ResultadoEmissaoNfeVenda>
> {
	const nota = await buscarNotaFiscalPorId(idnotafiscal);

	if (!nota) {
		return httpNaoEncontrado();
	}

	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		nota.idempresa,
	);

	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	if (nota.tipoorigem !== 1) {
		return httpBadRequest("Somente NF-e de venda podem ser transmitidas");
	}

	if (nota.status === NFE_STATUS.AUTORIZADA) {
		return httpBadRequest(
			"NF-e já autorizada não pode ser transmitida novamente",
		);
	}

	if (
		nota.status !== NFE_STATUS.PENDENTE &&
		nota.status !== NFE_STATUS.REJEITADA
	) {
		return httpBadRequest(
			"Somente NF-e pendentes ou rejeitadas podem ser transmitidas",
		);
	}

	const itensDb = await listarItensPorNotaFiscal(idnotafiscal);

	if (itensDb.length === 0) {
		return httpBadRequest("NF-e sem itens para transmissão");
	}

	const itens = mapearItensNotaParaEmissao(itensDb);
	const valorTotal = Number(nota.valortotalnota ?? 0);
	const emissaoSalva = extrairDadosEmissaoNfeSalvos(nota.dadosimportacao);
	const formaPagamento = emissaoSalva?.formaPagamento ?? "01";
	const tipoDevolucao = await resolverTipoDevolucaoEmissao(
		nota.idempresa,
		itens.map((item) => item.cfop),
	);
	const documentoSalvo = emissaoSalva?.documentoReferenciado;

	const finNFe =
		nota.finalidadeemissaonfe === FIN_NFE_DEVOLUCAO ||
		documentoSalvo?.chaveNfe ||
		documentoSalvo?.idnotafiscalReferenciada ||
		nota.chavedocumentoreferenciado
			? FIN_NFE_DEVOLUCAO
			: undefined;

	return emitirNfeVendaService({
		idusuario,
		idempresa: nota.idempresa,
		idnotafiscal,
		iddestinatario: nota.identidade ?? undefined,
		idserienfe: emissaoSalva?.idserienfe,
		idplanocontas: nota.idplanocontas ?? undefined,
		idcondicaopagto: nota.idcondicaopagto ?? undefined,
		idlocalestoque: nota.idlocalestoque ?? undefined,
		idtipodocumento: nota.idtipodocumento ?? undefined,
		iddav: emissaoSalva?.iddav,
		formasPagamento: emissaoSalva?.formasPagamento,
		gerarFinanceiro: emissaoSalva?.gerarFinanceiro,
		gerarEstoque: emissaoSalva?.gerarEstoque,
		confirmarProducao,
		natOp: emissaoSalva?.natOp,
		indPres: emissaoSalva?.indPres,
		itens,
		totais: {
			frete: Number(nota.frete ?? emissaoSalva?.totais?.frete ?? 0),
			seguro: Number(nota.seguro ?? emissaoSalva?.totais?.seguro ?? 0),
			desconto: Number(
				nota.descontosubtotal ?? emissaoSalva?.totais?.desconto ?? 0,
			),
			outrasDespesas: Number(
				nota.outrasdespesas ?? emissaoSalva?.totais?.outrasDespesas ?? 0,
			),
		},
		transporte: {
			modFrete: nota.tipofrete ?? emissaoSalva?.transporte?.modFrete ?? 9,
		},
		pagamento: normalizarPagamentoEmissaoNfe(
			{
				formas: [
					{
						tPag: formaPagamento,
						vPag: valorTotal > 0 ? valorTotal : 0.01,
					},
				],
			},
			{ finNFe, valorNota: valorTotal },
		),
		informacoesAdicionais: nota.observacao ?? undefined,
		documentoReferenciado:
			documentoSalvo?.chaveNfe ||
			documentoSalvo?.idnotafiscalReferenciada ||
			nota.chavedocumentoreferenciado
				? {
						tipoDevolucao:
							documentoSalvo?.tipoDevolucao ?? tipoDevolucao ?? undefined,
						idnotafiscalReferenciada: documentoSalvo?.idnotafiscalReferenciada,
						chaveNfe:
							documentoSalvo?.chaveNfe ??
							nota.chavedocumentoreferenciado ??
							undefined,
					}
				: undefined,
	});
}

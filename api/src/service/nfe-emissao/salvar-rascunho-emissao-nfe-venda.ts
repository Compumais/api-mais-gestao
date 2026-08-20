import { v4 as uuidv4 } from "uuid";
import type { HttpResponse } from "@/model/http-model.js";
import type { NovoNotaFiscalItem } from "@/model/nota-fiscal-item-model.js";
import type { NovaNotaFiscal } from "@/model/nota-fiscal-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	atualizarNotaFiscal,
	buscarNotaFiscalPorId,
	criarNotaFiscalComItens,
	substituirItensNotaFiscal,
} from "@/repositories/nota-fiscal-repositories.js";
import type {
	DestinatarioPayloadNfe,
	DocumentoReferenciadoPayloadNfe,
	ItemPayloadNfe,
	PagamentoPayloadNfe,
	TotaisPayloadNfe,
	TransportePayloadNfe,
} from "@/service/nfe-emissao/contexto-emissao-nfe.js";
import type { FormaPagamentoNfVenda } from "@/service/nota-fiscal/gerar-contas-receber-nf.js";
import {
	montarDadosImportacaoItemEmissaoNfe,
	montarSnapshotEmissaoNfe,
} from "@/util/dados-emissao-nfe-nota.js";
import {
	agoraBrasiliaIsoOffset,
	hojeBrasiliaIsoDate,
} from "@/util/data-hora-brasilia.js";
import { FIN_NFE_NORMAL } from "@/util/cfop-devolucao-emissao-nfe.js";
import { montarDestinatarioPorIdentidade } from "@/util/montar-destinatario-entidade-nfe.js";
import {
	httpBadRequest,
	httpCriacao,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { STATUS_RASCUNHO_IMPORTACAO } from "@/util/nota-fiscal-constants.js";

export type SalvarRascunhoEmissaoNfeVendaParametros = {
	idusuario: string;
	idempresa: string;
	idnotafiscal?: string;
	iddestinatario?: string;
	idserienfe?: string;
	natOp?: string;
	indPres?: number;
	itens: ItemPayloadNfe[];
	totais?: TotaisPayloadNfe;
	pagamento?: PagamentoPayloadNfe;
	transporte?: TransportePayloadNfe;
	informacoesAdicionais?: string;
	documentoReferenciado?: DocumentoReferenciadoPayloadNfe;
	idplanocontas?: string;
	idcondicaopagto?: string;
	idlocalestoque?: string;
	idtipodocumento?: string;
	iddav?: string;
	iddavs?: string[];
	codigosPedidos?: number[];
	formasPagamento?: FormaPagamentoNfVenda[];
	gerarFinanceiro?: boolean;
	gerarEstoque?: boolean;
};

export type SalvarRascunhoEmissaoNfeVendaResposta = {
	idnotafiscal: string;
	status: number;
};

function resumoLotePrincipal(item: ItemPayloadNfe) {
	const primeiro = item.rastros?.[0];
	if (!primeiro) {
		return {
			lote: null,
			datalote: null,
			datavalidade: null,
			idlote: null,
		};
	}

	return {
		lote: primeiro.nLote.slice(0, 30),
		datalote: primeiro.dFab ?? null,
		datavalidade: primeiro.dVal ?? null,
		idlote: primeiro.idlote ?? null,
	};
}

function montarItensRascunho(
	idnotafiscal: string,
	itens: ItemPayloadNfe[],
): NovoNotaFiscalItem[] {
	return itens.map((item, index) => ({
		id: uuidv4(),
		idnotafiscal,
		idproduto: item.idproduto ?? null,
		descricao: item.descricao,
		quantidade: String(item.quantidade),
		precounitario: String(item.valorUnitario),
		total: String(item.quantidade * item.valorUnitario),
		cfop: item.cfop,
		ncm: item.ncm,
		unidade: item.unidade,
		situacaotributaria: item.cst ?? item.csosn ?? null,
		cstpis: item.cstPis ?? null,
		cstcofins: item.cstCofins ?? null,
		aliquotapis: item.aliquotaPis != null ? String(item.aliquotaPis) : null,
		aliquotacofins:
			item.aliquotaCofins != null ? String(item.aliquotaCofins) : null,
		baseicms: item.baseIcms != null ? String(item.baseIcms) : null,
		percentualicms:
			item.aliquotaIcms != null ? String(item.aliquotaIcms) : null,
		icms: item.valorIcms != null ? String(item.valorIcms) : null,
		ipi: item.valorIpi != null ? String(item.valorIpi) : null,
		origem: item.orig ?? 0,
		contador: index + 1,
		tipo: "P",
		currenttimemillis: Date.now(),
		dadosimportacao: montarDadosImportacaoItemEmissaoNfe(item) ?? null,
		...resumoLotePrincipal(item),
	}));
}

function montarDadosNotaRascunho(params: {
	idnotafiscal: string;
	idempresa: string;
	idusuario: string;
	identidade?: string;
	destinatario?: DestinatarioPayloadNfe | null;
	vProd: number;
	vFrete: number;
	vDesc: number;
	agora: string;
	dataEmissao: string;
	informacoesAdicionais?: string;
	documentoReferenciado?: DocumentoReferenciadoPayloadNfe;
	natOp?: string;
	indPres?: number;
	pagamento?: PagamentoPayloadNfe;
	transporte?: TransportePayloadNfe;
	totais?: TotaisPayloadNfe;
	idserie?: string;
	idplanocontas?: string;
	idcondicaopagto?: string;
	idlocalestoque?: string;
	idtipodocumento?: string;
	iddav?: string;
	iddavs?: string[];
	codigosPedidos?: number[];
	formasPagamento?: FormaPagamentoNfVenda[];
	gerarFinanceiro?: boolean;
	gerarEstoque?: boolean;
}): NovaNotaFiscal {
	const valortotalnota = Math.max(
		0,
		params.vProd + params.vFrete - params.vDesc,
	).toFixed(2);

	return {
		id: params.idnotafiscal,
		idempresa: params.idempresa,
		identidade: params.identidade ?? null,
		idplanocontas: params.idplanocontas ?? null,
		idcondicaopagto: params.idcondicaopagto ?? null,
		idlocalestoque: params.idlocalestoque ?? null,
		idtipodocumento: params.idtipodocumento ?? null,
		idusuarioinclusao: params.idusuario,
		datainclusao: params.agora,
		emissao: params.dataEmissao,
		datahoraemissao: params.agora,
		currenttimemillis: Date.now(),
		modelo: "55",
		tipoorigem: 1,
		status: STATUS_RASCUNHO_IMPORTACAO,
		razaosocial: params.destinatario?.razaosocial ?? null,
		cnpjcpf: params.destinatario?.cnpjcpf ?? null,
		inscricaoestadual: params.destinatario?.ie ?? null,
		endereco: params.destinatario?.logradouro ?? null,
		numeroendereco: params.destinatario?.numero ?? null,
		bairro: params.destinatario?.bairro ?? null,
		cep: params.destinatario?.cep ?? null,
		cidade: params.destinatario?.codigomunicipioibge ?? null,
		estado: params.destinatario?.estado ?? null,
		valortotalnota,
		totalproduto: params.vProd.toFixed(2),
		frete: params.vFrete > 0 ? params.vFrete.toFixed(2) : null,
		descontosubtotal: params.vDesc > 0 ? params.vDesc.toFixed(2) : null,
		outrasdespesas:
			(params.totais?.outrasDespesas ?? 0) > 0
				? Number(params.totais?.outrasDespesas).toFixed(2)
				: null,
		seguro:
			(params.totais?.seguro ?? 0) > 0
				? Number(params.totais?.seguro).toFixed(2)
				: null,
		tipofrete: params.transporte?.modFrete ?? 9,
		observacao: params.informacoesAdicionais ?? null,
		finalidadeemissaonfe: FIN_NFE_NORMAL,
		chavedocumentoreferenciado: params.documentoReferenciado?.chave ?? null,
		modelodocumentoreferenciado: params.documentoReferenciado ? "55" : null,
		seriedocumentoreferenciado: params.documentoReferenciado?.serie ?? null,
		numerodocumentoreferenciado: params.documentoReferenciado?.numero ?? null,
		datadocumentoreferenciado: params.documentoReferenciado?.dataEmissao ?? null,
		tiponotadocumentoreferenciado: params.documentoReferenciado ? "NFE" : null,
		idserie: params.idserie ?? null,
		dadosimportacao: montarSnapshotEmissaoNfe({
			natOp: params.natOp,
			indPres: params.indPres,
			idserienfe: params.idserie,
			iddav: params.iddav,
			iddavs: params.iddavs,
			codigosPedidos: params.codigosPedidos,
			formasPagamento: params.formasPagamento?.map((forma) => ({
				idtipodocumentofinanceiro: forma.idtipodocumentofinanceiro,
				valor: forma.valor,
				...(forma.indPag !== undefined ? { indPag: forma.indPag } : {}),
			})),
			gerarFinanceiro: params.gerarFinanceiro,
			gerarEstoque: params.gerarEstoque,
			pagamento: params.pagamento,
			transporte: params.transporte,
			totais: params.totais,
			documentoReferenciado: params.documentoReferenciado
				? {
						chave: params.documentoReferenciado.chave,
						idnotafiscalReferenciada:
							params.documentoReferenciado.idnotafiscalReferenciada,
					}
				: undefined,
		}),
	};
}

export async function salvarRascunhoEmissaoNfeVendaService(
	params: SalvarRascunhoEmissaoNfeVendaParametros,
): Promise<HttpResponse<SalvarRascunhoEmissaoNfeVendaResposta>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		params.idusuario,
		params.idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const vProd = params.itens.reduce(
		(acc, item) => acc + item.quantidade * item.valorUnitario,
		0,
	);
	const vFrete = params.totais?.frete ?? 0;
	const vDesc = params.totais?.desconto ?? 0;
	const agora = agoraBrasiliaIsoOffset();
	const dataEmissao = hojeBrasiliaIsoDate();
	const destinatarioResolvido = await montarDestinatarioPorIdentidade(
		params.iddestinatario,
	);
	const destinatario = destinatarioResolvido?.destinatario ?? null;

	let idnotafiscal = params.idnotafiscal ?? uuidv4();
	let atualizacao = false;

	if (params.idnotafiscal) {
		const existente = await buscarNotaFiscalPorId(params.idnotafiscal);
		if (!existente || existente.idempresa !== params.idempresa) {
			return httpNaoEncontrado();
		}
		if (existente.tipoorigem !== 1) {
			return httpBadRequest("Somente rascunhos de NF-e de venda podem ser editados");
		}
		if (existente.status !== STATUS_RASCUNHO_IMPORTACAO) {
			return httpBadRequest(
				"Somente rascunhos podem ser atualizados por esta rota",
			);
		}
		atualizacao = true;
		idnotafiscal = existente.id;
	}

	const dadosNota = montarDadosNotaRascunho({
		idnotafiscal,
		idempresa: params.idempresa,
		idusuario: params.idusuario,
		identidade: params.iddestinatario,
		destinatario,
		vProd,
		vFrete,
		vDesc,
		agora,
		dataEmissao,
		informacoesAdicionais: params.informacoesAdicionais,
		documentoReferenciado: params.documentoReferenciado,
		natOp: params.natOp,
		indPres: params.indPres,
		pagamento: params.pagamento,
		transporte: params.transporte,
		totais: params.totais,
		idserie: params.idserienfe,
		idplanocontas: params.idplanocontas,
		idcondicaopagto: params.idcondicaopagto,
		idlocalestoque: params.idlocalestoque,
		idtipodocumento: params.idtipodocumento,
		iddav: params.iddav,
		iddavs: params.iddavs,
		codigosPedidos: params.codigosPedidos,
		formasPagamento: params.formasPagamento,
		gerarFinanceiro: params.gerarFinanceiro,
		gerarEstoque: params.gerarEstoque,
	});

	const itensPersistencia = montarItensRascunho(idnotafiscal, params.itens);

	if (atualizacao) {
		const { id, datainclusao, idusuarioinclusao, ...dadosAtualizacao } =
			dadosNota;
		void id;
		void datainclusao;
		void idusuarioinclusao;

		await atualizarNotaFiscal(idnotafiscal, dadosAtualizacao);
		await substituirItensNotaFiscal(idnotafiscal, itensPersistencia);

		return httpOk({
			idnotafiscal,
			status: STATUS_RASCUNHO_IMPORTACAO,
		});
	}

	await criarNotaFiscalComItens(dadosNota, itensPersistencia);

	return httpCriacao({
		idnotafiscal,
		status: STATUS_RASCUNHO_IMPORTACAO,
	});
}

export async function listarRascunhosEmissaoNfeVendaService({
	idusuario,
	idempresa,
	page = 1,
	limit = 10,
}: {
	idusuario: string;
	idempresa: string;
	page?: number;
	limit?: number;
}) {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const { listarNotasFiscaisPorEmpresa } = await import(
		"@/repositories/nota-fiscal-repositories.js"
	);

	const resultado = await listarNotasFiscaisPorEmpresa({
		idempresa,
		somenteRascunhos: true,
		tipoorigem: 1,
		modelo: "55",
		page,
		limit,
	});

	const total = resultado.total ?? 0;

	return httpOk({
		data: resultado.notas,
		paginacao: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	});
}

export async function excluirRascunhoEmissaoNfeVendaService({
	idusuario,
	idempresa,
	idRascunho,
}: {
	idusuario: string;
	idempresa: string;
	idRascunho: string;
}): Promise<HttpResponse<null>> {
	const usuarioPertenceEmpresa = await verificarUsuarioPertenceEmpresa(
		idusuario,
		idempresa,
	);
	if (!usuarioPertenceEmpresa) {
		return httpProibido();
	}

	const nota = await buscarNotaFiscalPorId(idRascunho);
	if (
		!nota ||
		nota.idempresa !== idempresa ||
		nota.tipoorigem !== 1 ||
		nota.status !== STATUS_RASCUNHO_IMPORTACAO
	) {
		return httpNaoEncontrado();
	}

	const { excluirNotaFiscal } = await import(
		"@/repositories/nota-fiscal-repositories.js"
	);
	await excluirNotaFiscal(idRascunho);

	return httpOk(null);
}

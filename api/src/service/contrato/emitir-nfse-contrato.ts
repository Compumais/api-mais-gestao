import type { Contrato, ContratoCobranca } from "@/model/contrato-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { atualizarContratoCobranca } from "@/repositories/contrato-cobranca-repositories.js";
import {
	emitirNfseService,
	type ResultadoEmissaoNfse,
} from "@/service/nfse-emissao/emitir-nfse.js";
import { STATUS_COBRANCA_FATURAMENTO } from "@/util/contrato-constants.js";
import { httpBadRequest, httpOk } from "@/util/http-util.js";
import { mensagemErroHttp } from "@/util/http-response-util.js";
import { NFE_STATUS } from "@/util/nfe-status.js";

type EmitirNfseContratoParametros = {
	contrato: Contrato;
	cobranca: ContratoCobranca;
	idusuario: string;
};

export async function emitirNfseContratoService({
	contrato,
	cobranca,
	idusuario,
}: EmitirNfseContratoParametros): Promise<
	HttpResponse<ResultadoEmissaoNfse & { pendente: boolean }>
> {
	if (!contrato.itemlistaservico || !contrato.discriminacao) {
		return httpBadRequest(
			"Contrato sem dados fiscais para emissão de NFS-e",
		);
	}

	const valor = Number(cobranca.valor);
	const discriminacao =
		cobranca.discriminacao?.trim() ||
		`${contrato.discriminacao} - Competência ${cobranca.competencia}`;

	const resultado = await emitirNfseService({
		idempresa: contrato.idempresa,
		idusuario,
		iddestinatario: contrato.identidade,
		gerarFinanceiro: false,
		competencia: `${cobranca.competencia}-01`,
		idplanocontas: contrato.idplanocontas ?? undefined,
		idcondicaopagto: contrato.idcondicaopagto ?? undefined,
		idtipodocumento: contrato.idtipodocumento ?? undefined,
		servico: {
			itemListaServico: contrato.itemlistaservico,
			discriminacao,
			codigoNbs: contrato.codigonbs ?? undefined,
			codigoTributacaoNacional: contrato.codigotributacaonacional ?? undefined,
			valores: {
				servicos: valor,
			},
		},
		itens: [
			{
				descricao: discriminacao,
				quantidade: 1,
				valorUnitario: valor,
				codigoListaLc11603: contrato.itemlistaservico,
			},
		],
	});

	if (!resultado.success || !resultado.body) {
		return httpBadRequest(
			mensagemErroHttp(resultado, "Falha ao emitir NFS-e do contrato"),
		);
	}

	const autorizada = resultado.body.status === NFE_STATUS.AUTORIZADA;
	const pendente = Boolean(resultado.body.pendente) || !autorizada;

	await atualizarContratoCobranca(cobranca.id, {
		idnotafiscal: resultado.body.idnotafiscal,
		statusfaturamento: pendente
			? STATUS_COBRANCA_FATURAMENTO.AGUARDANDO_AUTORIZACAO_NFSE
			: STATUS_COBRANCA_FATURAMENTO.NFSE_AUTORIZADA,
		etapaatual: pendente
			? "aguardando_autorizacao_nfse"
			: "nfse_autorizada",
		ultimoerro: pendente
			? resultado.body.mensagemErro ?? "Aguardando autorização da NFS-e"
			: null,
	});

	return httpOk({
		...resultado.body,
		pendente,
	});
}

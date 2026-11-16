import type { ContratoCobranca } from "@/model/contrato-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { buscarNotaFiscalPorId } from "@/repositories/nota-fiscal-repositories.js";
import { buscarContratoPorId } from "@/repositories/contrato-repositories.js";
import {
	atualizarContratoCobranca,
	buscarContratoCobrancaPorId,
} from "@/repositories/contrato-cobranca-repositories.js";
import { gerarBoletoService } from "@/service/boleto/gerar-boleto.js";
import { criarFinanceiroContratoService } from "@/service/contrato/criar-financeiro-contrato.js";
import { emitirNfseContratoService } from "@/service/contrato/emitir-nfse-contrato.js";
import { incluirTituloRemessaService } from "@/service/remessa-bancaria/incluir-titulo-remessa.js";
import {
	FLUXO_FATURAMENTO_CONTRATO,
	STATUS_COBRANCA_FATURAMENTO,
} from "@/util/contrato-constants.js";
import { httpBadRequest, httpOk } from "@/util/http-util.js";
import { mensagemErroHttp } from "@/util/http-response-util.js";
import { NFE_STATUS } from "@/util/nfe-status.js";

type ProcessarCobrancaParametros = {
	idcobranca: string;
	idusuario: string;
};

export type ResultadoProcessarCobranca = {
	cobranca: ContratoCobranca;
};

async function marcarErro(id: string, mensagem: string, tentativas: number) {
	return atualizarContratoCobranca(id, {
		statusfaturamento: STATUS_COBRANCA_FATURAMENTO.ERRO,
		etapaatual: "erro",
		ultimoerro: mensagem,
		tentativas: tentativas + 1,
	});
}

export async function processarCobrancaContratoService({
	idcobranca,
	idusuario,
}: ProcessarCobrancaParametros): Promise<
	HttpResponse<ResultadoProcessarCobranca>
> {
	let cobranca = await buscarContratoCobrancaPorId(idcobranca);
	if (!cobranca) return httpBadRequest("Cobrança não encontrada");

	if (
		cobranca.statusfaturamento === STATUS_COBRANCA_FATURAMENTO.CONCLUIDO
	) {
		return httpOk({ cobranca });
	}

	const contrato = await buscarContratoPorId(cobranca.idcontrato);
	if (!contrato) {
		await marcarErro(cobranca.id, "Contrato não encontrado", cobranca.tentativas);
		return httpBadRequest("Contrato não encontrado");
	}

	cobranca =
		(await atualizarContratoCobranca(cobranca.id, {
			statusfaturamento: STATUS_COBRANCA_FATURAMENTO.PROCESSANDO,
			etapaatual: "processando",
			ultimoerro: null,
		})) ?? cobranca;

	const fluxo = cobranca.fluxofaturamento;

	try {
		// Fluxo 1: NFS-e
		if (fluxo === FLUXO_FATURAMENTO_CONTRATO.NFSE_CR_BOLETO_REMESSA) {
			if (!cobranca.idnotafiscal) {
				const emissao = await emitirNfseContratoService({
					contrato,
					cobranca,
					idusuario,
				});
				if (!emissao.success || !emissao.body) {
					const mensagem = mensagemErroHttp(emissao, "Falha ao emitir NFS-e");
					await marcarErro(cobranca.id, mensagem, cobranca.tentativas);
					return httpBadRequest(mensagem);
				}

				cobranca =
					(await buscarContratoCobrancaPorId(cobranca.id)) ?? cobranca;

				if (emissao.body.pendente) {
					return httpOk({ cobranca });
				}
			} else {
				const nota = await buscarNotaFiscalPorId(cobranca.idnotafiscal);
				if (!nota) {
					await marcarErro(
						cobranca.id,
						"NFS-e vinculada não encontrada",
						cobranca.tentativas,
					);
					return httpBadRequest("NFS-e vinculada não encontrada");
				}
				if (nota.status === NFE_STATUS.PENDENTE) {
					cobranca =
						(await atualizarContratoCobranca(cobranca.id, {
							statusfaturamento:
								STATUS_COBRANCA_FATURAMENTO.AGUARDANDO_AUTORIZACAO_NFSE,
							etapaatual: "aguardando_autorizacao_nfse",
						})) ?? cobranca;
					return httpOk({ cobranca });
				}
				if (nota.status !== NFE_STATUS.AUTORIZADA) {
					await marcarErro(
						cobranca.id,
						`NFS-e com status ${nota.status}`,
						cobranca.tentativas,
					);
					return httpBadRequest(`NFS-e com status ${nota.status}`);
				}
				cobranca =
					(await atualizarContratoCobranca(cobranca.id, {
						statusfaturamento: STATUS_COBRANCA_FATURAMENTO.NFSE_AUTORIZADA,
						etapaatual: "nfse_autorizada",
					})) ?? cobranca;
			}
		}

		// Contas a receber (todos os fluxos)
		cobranca = (await buscarContratoCobrancaPorId(cobranca.id)) ?? cobranca;
		const titulo = await criarFinanceiroContratoService({ cobranca });
		if (!titulo.success || !titulo.body) {
			const mensagem = mensagemErroHttp(titulo, "Falha ao criar título");
			await marcarErro(cobranca.id, mensagem, cobranca.tentativas);
			return httpBadRequest(mensagem);
		}

		cobranca = (await buscarContratoCobrancaPorId(cobranca.id)) ?? cobranca;

		// Fluxo 3 encerra aqui
		if (fluxo === FLUXO_FATURAMENTO_CONTRATO.SO_CR) {
			cobranca =
				(await atualizarContratoCobranca(cobranca.id, {
					statusfaturamento: STATUS_COBRANCA_FATURAMENTO.CONCLUIDO,
					etapaatual: "concluido",
					ultimoerro: null,
				})) ?? cobranca;
			return httpOk({ cobranca });
		}

		// Boleto (fluxos 1 e 2)
		if (!contrato.idcontacorrente) {
			await marcarErro(
				cobranca.id,
				"Contrato sem conta corrente de cobrança",
				cobranca.tentativas,
			);
			return httpBadRequest("Contrato sem conta corrente de cobrança");
		}

		const boleto = await gerarBoletoService({
			idfinanceiro: titulo.body.idfinanceiro,
			idcontacorrente: contrato.idcontacorrente,
		});
		if (!boleto.success || !boleto.body) {
			const mensagem = mensagemErroHttp(boleto, "Falha ao gerar boleto");
			await marcarErro(cobranca.id, mensagem, cobranca.tentativas);
			return httpBadRequest(mensagem);
		}

		cobranca =
			(await atualizarContratoCobranca(cobranca.id, {
				statusfaturamento: STATUS_COBRANCA_FATURAMENTO.BOLETO_GERADO,
				etapaatual: "boleto_gerado",
			})) ?? cobranca;

		const remessa = await incluirTituloRemessaService({
			idempresa: cobranca.idempresa,
			idusuario,
			idfinanceiro: titulo.body.idfinanceiro,
			idcontacorrente: contrato.idcontacorrente,
			idcobranca: cobranca.id,
		});
		if (!remessa.success || !remessa.body) {
			const mensagem = mensagemErroHttp(
				remessa,
				"Falha ao incluir na remessa",
			);
			await marcarErro(cobranca.id, mensagem, cobranca.tentativas);
			return httpBadRequest(mensagem);
		}

		cobranca =
			(await atualizarContratoCobranca(cobranca.id, {
				idremessaitem: remessa.body.idremessaitem,
				statusfaturamento: STATUS_COBRANCA_FATURAMENTO.CONCLUIDO,
				etapaatual: "concluido",
				ultimoerro: null,
			})) ?? cobranca;

		return httpOk({ cobranca });
	} catch (error) {
		const mensagem =
			error instanceof Error ? error.message : "Erro inesperado no faturamento";
		await marcarErro(cobranca.id, mensagem, cobranca.tentativas);
		return httpBadRequest(mensagem);
	}
}

import { v4 as uuidv4 } from "uuid";
import type {
	ContratoCobranca,
	ContratoFaturamentoLote,
} from "@/model/contrato-model.js";
import type { HttpResponse } from "@/model/http-model.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import { buscarContratoPorIdEempresa } from "@/repositories/contrato-repositories.js";
import {
	atualizarContratoCobranca,
	buscarContratoCobrancaPorContratoCompetencia,
	criarContratoCobrancaSeNaoExistir,
	listarCobrancasPorLote,
} from "@/repositories/contrato-cobranca-repositories.js";
import {
	atualizarContratoFaturamentoLote,
	criarContratoFaturamentoLote,
} from "@/repositories/contrato-faturamento-lote-repositories.js";
import { processarCobrancaContratoService } from "@/service/contrato/processar-cobranca-contrato.js";
import {
	STATUS_COBRANCA_FATURAMENTO,
	STATUS_LOTE_FATURAMENTO,
} from "@/util/contrato-constants.js";
import {
	calcularVencimentoCompetencia,
	parseCompetencia,
} from "@/util/contrato-faturamento-util.js";
import {
	httpBadRequest,
	httpOk,
	httpProibido,
	httpRecursoExistente,
} from "@/util/http-util.js";
import { mensagemErroHttp } from "@/util/http-response-util.js";

type ConfirmarLoteParametros = {
	idempresa: string;
	idusuario: string;
	competencia: string;
	idsContratos: string[];
};

export type ResultadoConfirmarLote = {
	lote: ContratoFaturamentoLote;
	cobrancas: ContratoCobranca[];
};

export async function confirmarLoteFaturamentoService({
	idempresa,
	idusuario,
	competencia,
	idsContratos,
}: ConfirmarLoteParametros): Promise<HttpResponse<ResultadoConfirmarLote>> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	if (!parseCompetencia(competencia)) {
		return httpBadRequest("Competência inválida. Use YYYY-MM");
	}
	if (!idsContratos.length) {
		return httpBadRequest("Selecione ao menos um contrato");
	}

	const lote = await criarContratoFaturamentoLote({
		id: uuidv4(),
		idempresa,
		competencia,
		status: STATUS_LOTE_FATURAMENTO.PROCESSANDO,
		idusuario,
		observacao: null,
		criadoem: new Date().toISOString(),
		atualizadoem: new Date().toISOString(),
	});

	if (!lote) return httpBadRequest("Falha ao criar lote de faturamento");

	const cobrancas: ContratoCobranca[] = [];

	for (const idcontrato of idsContratos) {
		const contrato = await buscarContratoPorIdEempresa(idcontrato, idempresa);
		if (!contrato) continue;

		const existente = await buscarContratoCobrancaPorContratoCompetencia(
			idempresa,
			idcontrato,
			competencia,
		);

		if (
			existente &&
			existente.statusfaturamento === STATUS_COBRANCA_FATURAMENTO.CONCLUIDO
		) {
			cobrancas.push(existente);
			continue;
		}

		const vencimento = calcularVencimentoCompetencia(
			competencia,
			contrato.diavencimento,
			contrato.regracompetencia,
		);
		if (!vencimento) continue;

		let cobranca = existente;
		if (!cobranca) {
			cobranca = await criarContratoCobrancaSeNaoExistir({
				id: uuidv4(),
				idempresa,
				idcontrato,
				idlote: lote.id,
				competencia,
				valor: contrato.valor,
				vencimento,
				fluxofaturamento: contrato.fluxofaturamento,
				discriminacao: contrato.discriminacao,
				statusfaturamento: STATUS_COBRANCA_FATURAMENTO.ELEGIVEL,
				etapaatual: "elegivel",
				ultimoerro: null,
				tentativas: 0,
				idnotafiscal: null,
				idfinanceiro: null,
				idremessaitem: null,
				criadoem: new Date().toISOString(),
				atualizadoem: new Date().toISOString(),
			});

			if (!cobranca) {
				const novamente = await buscarContratoCobrancaPorContratoCompetencia(
					idempresa,
					idcontrato,
					competencia,
				);
				if (!novamente) continue;
				cobranca = novamente;
			}
		}

		cobranca =
			(await atualizarContratoCobranca(cobranca.id, {
				idlote: lote.id,
			})) ?? cobranca;

		await processarCobrancaContratoService({
			idcobranca: cobranca.id,
			idusuario,
		});

		const atualizada = await buscarContratoCobrancaPorContratoCompetencia(
			idempresa,
			idcontrato,
			competencia,
		);
		if (atualizada) cobrancas.push(atualizada);
	}

	const todas = await listarCobrancasPorLote(lote.id);
	const concluidas = todas.filter(
		(c) => c.statusfaturamento === STATUS_COBRANCA_FATURAMENTO.CONCLUIDO,
	).length;
	const comErro = todas.filter(
		(c) => c.statusfaturamento === STATUS_COBRANCA_FATURAMENTO.ERRO,
	).length;
	const aguardando = todas.filter(
		(c) =>
			c.statusfaturamento ===
			STATUS_COBRANCA_FATURAMENTO.AGUARDANDO_AUTORIZACAO_NFSE,
	).length;

	let statusLote: string = STATUS_LOTE_FATURAMENTO.CONCLUIDO;
	if (concluidas === todas.length && todas.length > 0) {
		statusLote = STATUS_LOTE_FATURAMENTO.CONCLUIDO;
	} else if (concluidas > 0 || aguardando > 0) {
		statusLote = STATUS_LOTE_FATURAMENTO.CONCLUIDO_PARCIAL;
	} else if (comErro > 0) {
		statusLote = STATUS_LOTE_FATURAMENTO.CONCLUIDO_PARCIAL;
	} else if (aguardando > 0) {
		statusLote = STATUS_LOTE_FATURAMENTO.PROCESSANDO;
	}

	const loteAtualizado =
		(await atualizarContratoFaturamentoLote(lote.id, {
			status: statusLote,
		})) ?? lote;

	return httpOk({
		lote: loteAtualizado,
		cobrancas: todas.length ? todas : cobrancas,
	});
}

export async function retomarCobrancaContratoService({
	idcobranca,
	idempresa,
	idusuario,
}: {
	idcobranca: string;
	idempresa: string;
	idusuario: string;
}): Promise<HttpResponse<{ cobranca: ContratoCobranca }>> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const resultado = await processarCobrancaContratoService({
		idcobranca,
		idusuario,
	});

	if (!resultado.success || !resultado.body) {
		if (resultado.status === 409) return httpRecursoExistente();
		return httpBadRequest(
			mensagemErroHttp(resultado, "Falha ao retomar cobrança"),
		);
	}

	return httpOk(resultado.body);
}

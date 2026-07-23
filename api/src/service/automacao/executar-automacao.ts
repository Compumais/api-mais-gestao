import {
	atualizarAutomacao,
	buscarAutomacaoPorId,
	type Automacao,
} from "@/repositories/automacao-repositories.js";
import {
	finalizarExecucao,
	registrarInicioExecucao,
} from "@/repositories/tarefa-execucao-repositories.js";
import {
	calcularProximaExecucao,
	type RecorrenciaAutomacao,
} from "@/service/automacao/calcular-proxima-execucao.js";
import {
	executarEnvioFiscalContabilidade,
	FUNCAO_ENVIO_FISCAL_CONTABILIDADE,
	type ResultadoFuncaoAutomacao,
} from "@/service/automacao/funcoes/envio-fiscal-contabilidade.js";
import {
	executarAlertaPendenciasNf,
	FUNCAO_ALERTA_PENDENCIAS_NF,
} from "@/service/automacao/funcoes/alerta-pendencias-nf.js";
import { criarNotificacaoAgendadaService } from "@/service/notificacoes/criar-notificacao-agendada.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	httpNaoEncontrado,
	httpOk,
	httpProibido,
} from "@/util/http-util.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";

const RETRY_PENDENCIA_MS = 6 * 60 * 60 * 1000;

async function despacharFuncao(
	automacao: Automacao,
	referencia: Date,
): Promise<HttpResponse<ResultadoFuncaoAutomacao>> {
	if (automacao.funcao === FUNCAO_ENVIO_FISCAL_CONTABILIDADE) {
		return executarEnvioFiscalContabilidade(automacao, referencia);
	}

	if (automacao.funcao === FUNCAO_ALERTA_PENDENCIAS_NF) {
		return executarAlertaPendenciasNf(automacao, referencia);
	}

	return httpOk<ResultadoFuncaoAutomacao>({
		status: "falha",
		mensagem: `Função não implementada: ${automacao.funcao}`,
	});
}

export async function executarAutomacaoAgora(
	automacao: Automacao,
	referencia: Date = new Date(),
) {
	const tipo = `automacao:${automacao.funcao}` as const;
	const idExecucao = await registrarInicioExecucao({
		tipo,
		idempresa: automacao.idempresa,
	});

	try {
		const resultadoHttp = await despacharFuncao(automacao, referencia);
		if (!resultadoHttp.success || !resultadoHttp.body) {
			const mensagem =
				!resultadoHttp.success && typeof resultadoHttp.error === "string"
					? resultadoHttp.error
					: "Falha ao executar função da automação";
			await finalizarExecucao({
				id: idExecucao,
				status: "erro",
				erro: mensagem,
				detalhes: { idautomacao: automacao.id },
			});
			await atualizarAutomacao(automacao.id, {
				ultimaexecucao: new Date().toISOString(),
				statusultima: "falha",
				proximaexecucao: new Date(
					Date.now() + RETRY_PENDENCIA_MS,
				).toISOString(),
				atualizadoem: new Date().toISOString(),
			});
			return {
				status: "falha" as const,
				mensagem,
			};
		}

		const body = resultadoHttp.body;
		const statusResultado = body.status;
		const agora = new Date();
		const agoraIso = agora.toISOString();

		let proxima: string | null = automacao.proximaexecucao;
		let ativo = automacao.ativo;

		if (statusResultado === "aguardando_correcao" || body.reagendarTentativa) {
			proxima = new Date(agora.getTime() + RETRY_PENDENCIA_MS).toISOString();
		} else if (statusResultado === "sucesso") {
			if (automacao.recorrencia === "unica") {
				proxima = null;
				ativo = false;
			} else {
				const calc = calcularProximaExecucao({
					recorrencia: automacao.recorrencia as RecorrenciaAutomacao,
					horario: automacao.horario,
					diames: automacao.diames,
					diasemana: automacao.diasemana,
					aPartirDe: agora,
					aposExecucao: true,
				});
				proxima = calc ? calc.toISOString() : null;
			}
		} else if (statusResultado === "falha") {
			proxima = new Date(agora.getTime() + RETRY_PENDENCIA_MS).toISOString();
			await criarNotificacaoAgendadaService({
				tipo: "alerta_agendado",
				idempresa: automacao.idempresa,
				idrecurso: `automacao-falha:${automacao.id}:${agoraIso}`,
				titulo: `Falha na automação "${automacao.nome}": ${body.mensagem}`,
				detalhes: {
					idautomacao: automacao.id,
					...(body.detalhes ?? {}),
				},
			});
		}

		await atualizarAutomacao(automacao.id, {
			ultimaexecucao: agoraIso,
			statusultima: statusResultado,
			proximaexecucao: proxima,
			ativo,
			atualizadoem: agoraIso,
		});

		await finalizarExecucao({
			id: idExecucao,
			status: statusResultado === "sucesso" ? "sucesso" : "erro",
			detalhes: {
				idautomacao: automacao.id,
				status: statusResultado,
				mensagem: body.mensagem,
				...(body.detalhes ?? {}),
			},
			erro: statusResultado === "sucesso" ? undefined : body.mensagem,
		});

		return {
			status: statusResultado,
			mensagem: body.mensagem,
			detalhes: body.detalhes,
		};
	} catch (erro) {
		const mensagem =
			erro instanceof Error ? erro.message : "Erro ao executar automação";
		await finalizarExecucao({
			id: idExecucao,
			status: "erro",
			erro: mensagem,
			detalhes: { idautomacao: automacao.id },
		});
		await atualizarAutomacao(automacao.id, {
			ultimaexecucao: new Date().toISOString(),
			statusultima: "falha",
			proximaexecucao: new Date(
				Date.now() + RETRY_PENDENCIA_MS,
			).toISOString(),
			atualizadoem: new Date().toISOString(),
		});
		throw erro;
	}
}

export async function executarAutomacaoManualService({
	idusuario,
	id,
}: {
	idusuario: string;
	id: string;
}): Promise<
	HttpResponse<{
		status: string;
		mensagem: string;
		detalhes?: Record<string, unknown>;
	}>
> {
	const automacao = await buscarAutomacaoPorId(id);
	if (!automacao) return httpNaoEncontrado();

	const pertence = await verificarUsuarioPertenceEmpresa(
		idusuario,
		automacao.idempresa,
	);
	if (!pertence) return httpProibido();

	const resultado = await executarAutomacaoAgora(automacao);
	return httpOk(resultado);
}

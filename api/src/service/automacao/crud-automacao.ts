import { v4 as uuidv4 } from "uuid";
import type { AutomacaoParametros } from "../../../drizzle/tables/automacao.js";
import type { HttpResponse } from "@/model/http-model.js";
import {
	atualizarAutomacao,
	buscarAutomacaoPorId,
	criarAutomacao,
	excluirAutomacao,
	listarAutomacoesPorEmpresa,
	type Automacao,
} from "@/repositories/automacao-repositories.js";
import { listarExecucoesTarefas } from "@/repositories/tarefa-execucao-repositories.js";
import { verificarUsuarioPertenceEmpresa } from "@/repositories/entidade-repositories.js";
import {
	calcularProximaExecucao,
	type RecorrenciaAutomacao,
} from "@/service/automacao/calcular-proxima-execucao.js";
import { FUNCAO_ENVIO_FISCAL_CONTABILIDADE } from "@/service/automacao/funcoes/envio-fiscal-contabilidade.js";
import {
	httpBadRequest,
	httpCriacao,
	httpNaoEncontrado,
	httpOk,
	httpProibido,
	httpSemConteudo,
} from "@/util/http-util.js";

const FUNCOES_VALIDAS = new Set([FUNCAO_ENVIO_FISCAL_CONTABILIDADE]);
const RECORRENCIAS = new Set<RecorrenciaAutomacao>([
	"unica",
	"diaria",
	"semanal",
	"mensal",
]);

export type DadosAutomacaoInput = {
	idempresa: string;
	nome: string;
	funcao: string;
	ativo?: boolean;
	recorrencia: RecorrenciaAutomacao;
	horario: string;
	diames?: number | null;
	diasemana?: number | null;
	parametros?: AutomacaoParametros | null;
	/** ISO opcional para execução única imediata/agendada */
	proximaexecucao?: string | null;
};

function validarInput(dados: DadosAutomacaoInput): string | null {
	if (!dados.nome.trim()) return "Nome é obrigatório";
	if (!FUNCOES_VALIDAS.has(dados.funcao)) return "Função de automação inválida";
	if (!RECORRENCIAS.has(dados.recorrencia)) return "Recorrência inválida";
	if (!/^\d{2}:\d{2}$/.test(dados.horario)) return "Horário inválido (HH:mm)";
	if (dados.recorrencia === "mensal") {
		const d = dados.diames ?? 5;
		if (d < 1 || d > 28) return "Dia do mês deve ser entre 1 e 28";
	}
	if (dados.recorrencia === "semanal") {
		const d = dados.diasemana ?? 1;
		if (d < 0 || d > 6) return "Dia da semana inválido (0–6)";
	}
	return null;
}

function resolverProxima(
	dados: DadosAutomacaoInput,
	aposExecucao = false,
): string | null {
	if (dados.proximaexecucao && !aposExecucao) {
		return new Date(dados.proximaexecucao).toISOString();
	}
	const proxima = calcularProximaExecucao({
		recorrencia: dados.recorrencia,
		horario: dados.horario,
		diames: dados.diames,
		diasemana: dados.diasemana,
		aposExecucao,
	});
	return proxima ? proxima.toISOString() : null;
}

export async function listarAutomacoesService({
	idusuario,
	idempresa,
}: {
	idusuario: string;
	idempresa: string;
}): Promise<HttpResponse<Automacao[]>> {
	const pertence = await verificarUsuarioPertenceEmpresa(idusuario, idempresa);
	if (!pertence) return httpProibido();

	const lista = await listarAutomacoesPorEmpresa({ idempresa });
	return httpOk(lista);
}

export async function criarAutomacaoService({
	idusuario,
	dados,
}: {
	idusuario: string;
	dados: DadosAutomacaoInput;
}): Promise<HttpResponse<Automacao>> {
	const pertence = await verificarUsuarioPertenceEmpresa(
		idusuario,
		dados.idempresa,
	);
	if (!pertence) return httpProibido();

	const erro = validarInput(dados);
	if (erro) return httpBadRequest(erro);

	const agora = new Date().toISOString();
	const proxima = resolverProxima(dados);
	if (!proxima && dados.ativo !== false) {
		return httpBadRequest("Não foi possível calcular a próxima execução");
	}

	const criada = await criarAutomacao({
		id: uuidv4(),
		idempresa: dados.idempresa,
		nome: dados.nome.trim(),
		funcao: dados.funcao,
		ativo: dados.ativo ?? true,
		recorrencia: dados.recorrencia,
		horario: dados.horario,
		diames: dados.recorrencia === "mensal" ? (dados.diames ?? 5) : null,
		diasemana: dados.recorrencia === "semanal" ? (dados.diasemana ?? 1) : null,
		parametros: dados.parametros ?? {
			incluirSintegra: true,
			incluirXml: true,
			finalidadeSintegra: "1",
		},
		proximaexecucao: proxima,
		ultimaexecucao: null,
		statusultima: null,
		criadoem: agora,
		atualizadoem: agora,
	});

	if (!criada) return httpBadRequest("Não foi possível criar a automação");
	return httpCriacao(criada);
}

export async function atualizarAutomacaoService({
	idusuario,
	id,
	dados,
}: {
	idusuario: string;
	id: string;
	dados: Partial<DadosAutomacaoInput> & { ativo?: boolean };
}): Promise<HttpResponse<Automacao>> {
	const existente = await buscarAutomacaoPorId(id);
	if (!existente) return httpNaoEncontrado();

	const pertence = await verificarUsuarioPertenceEmpresa(
		idusuario,
		existente.idempresa,
	);
	if (!pertence) return httpProibido();

	const merged: DadosAutomacaoInput = {
		idempresa: existente.idempresa,
		nome: dados.nome ?? existente.nome,
		funcao: dados.funcao ?? existente.funcao,
		ativo: dados.ativo ?? existente.ativo,
		recorrencia: (dados.recorrencia ??
			existente.recorrencia) as RecorrenciaAutomacao,
		horario: dados.horario ?? existente.horario,
		diames: dados.diames !== undefined ? dados.diames : existente.diames,
		diasemana:
			dados.diasemana !== undefined ? dados.diasemana : existente.diasemana,
		parametros:
			dados.parametros !== undefined
				? dados.parametros
				: existente.parametros,
		proximaexecucao: dados.proximaexecucao,
	};

	const erro = validarInput(merged);
	if (erro) return httpBadRequest(erro);

	const agendaMudou =
		dados.recorrencia !== undefined ||
		dados.horario !== undefined ||
		dados.diames !== undefined ||
		dados.diasemana !== undefined ||
		dados.proximaexecucao !== undefined ||
		dados.ativo === true;

	const agora = new Date().toISOString();
	const atualizado = await atualizarAutomacao(id, {
		nome: merged.nome.trim(),
		funcao: merged.funcao,
		ativo: merged.ativo ?? true,
		recorrencia: merged.recorrencia,
		horario: merged.horario,
		diames: merged.recorrencia === "mensal" ? (merged.diames ?? 5) : null,
		diasemana:
			merged.recorrencia === "semanal" ? (merged.diasemana ?? 1) : null,
		parametros: merged.parametros ?? null,
		proximaexecucao: agendaMudou
			? resolverProxima(merged)
			: existente.proximaexecucao,
		atualizadoem: agora,
	});

	if (!atualizado) return httpBadRequest("Não foi possível atualizar");
	return httpOk(atualizado);
}

export async function excluirAutomacaoService({
	idusuario,
	id,
}: {
	idusuario: string;
	id: string;
}): Promise<HttpResponse<null>> {
	const existente = await buscarAutomacaoPorId(id);
	if (!existente) return httpNaoEncontrado();

	const pertence = await verificarUsuarioPertenceEmpresa(
		idusuario,
		existente.idempresa,
	);
	if (!pertence) return httpProibido();

	await excluirAutomacao(id);
	return httpSemConteudo();
}

export async function listarExecucoesAutomacaoService({
	idusuario,
	id,
}: {
	idusuario: string;
	id: string;
}): Promise<
	HttpResponse<
		Awaited<ReturnType<typeof listarExecucoesTarefas>>
	>
> {
	const existente = await buscarAutomacaoPorId(id);
	if (!existente) return httpNaoEncontrado();

	const pertence = await verificarUsuarioPertenceEmpresa(
		idusuario,
		existente.idempresa,
	);
	if (!pertence) return httpProibido();

	const execucoes = await listarExecucoesTarefas({
		tipo: `automacao:${existente.funcao}`,
		idempresa: existente.idempresa,
		limit: 50,
	});

	const filtradas = execucoes.filter((e) => {
		const detalhes = e.detalhes as Record<string, unknown> | null;
		return detalhes?.idautomacao === id;
	});

	return httpOk(filtradas);
}

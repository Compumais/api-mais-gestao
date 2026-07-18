import { api } from "@/lib/axios";
import type { FuncaoAutomacao } from "@/schemas/automacao.schema";

export type AutomacaoParametros = {
	incluirSintegra?: boolean;
	incluirXml?: boolean;
	finalidadeSintegra?: "1" | "2" | "3" | "5";
	incluirNfe?: boolean;
	incluirNfce?: boolean;
};

export type Automacao = {
	id: string;
	idempresa: string;
	nome: string;
	funcao: string;
	ativo: boolean;
	recorrencia: "unica" | "diaria" | "semanal" | "mensal";
	horario: string;
	diames: number | null;
	diasemana: number | null;
	parametros: AutomacaoParametros | null;
	proximaexecucao: string | null;
	ultimaexecucao: string | null;
	statusultima: string | null;
	criadoem: string;
	atualizadoem: string;
};

export type CriarAutomacaoData = {
	idempresa: string;
	nome: string;
	funcao: FuncaoAutomacao;
	ativo?: boolean;
	recorrencia: Automacao["recorrencia"];
	horario: string;
	diames?: number | null;
	diasemana?: number | null;
	parametros?: AutomacaoParametros | null;
};

export type ResultadoExecucaoAutomacao = {
	status: string;
	mensagem: string;
	detalhes?: Record<string, unknown>;
};

export type ExecucaoAutomacao = {
	id: string;
	tipo: string;
	status: string;
	iniciadoem: string;
	finalizadoem: string | null;
	detalhes: Record<string, unknown> | null;
	erro: string | null;
};

export const automacaoService = {
	async listar(idempresa: string): Promise<Automacao[]> {
		const { data } = await api.get<Automacao[]>("/automacoes", {
			params: { idempresa },
		});
		return data;
	},

	async criar(dados: CriarAutomacaoData): Promise<Automacao> {
		const { data } = await api.post<Automacao>("/automacoes", dados);
		return data;
	},

	async atualizar(
		id: string,
		dados: Partial<Omit<CriarAutomacaoData, "idempresa">>,
	): Promise<Automacao> {
		const { data } = await api.put<Automacao>(`/automacoes/${id}`, dados);
		return data;
	},

	async excluir(id: string): Promise<void> {
		await api.delete(`/automacoes/${id}`);
	},

	async executar(id: string): Promise<ResultadoExecucaoAutomacao> {
		const { data } = await api.post<ResultadoExecucaoAutomacao>(
			`/automacoes/${id}/executar`,
		);
		return data;
	},

	async listarExecucoes(id: string): Promise<ExecucaoAutomacao[]> {
		const { data } = await api.get<ExecucaoAutomacao[]>(
			`/automacoes/${id}/execucoes`,
		);
		return data;
	},
};

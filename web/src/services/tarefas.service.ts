import { api } from "@/lib/axios";

export type TipoTarefaExecucao =
	| "alerta_vencimento"
	| "saldo_baixo"
	| "conciliacao_pendente"
	| "relatorios_automaticos"
	| "verificar_ciclos_plano";

export interface TarefaExecucao {
	id: string;
	tipo: TipoTarefaExecucao;
	idempresa: string | null;
	status: string;
	iniciadoem: string;
	finalizadoem: string | null;
	detalhes: Record<string, unknown> | null;
	erro: string | null;
}

export interface ListarExecucoesParams {
	idempresa?: string;
	tipo?: TipoTarefaExecucao;
	limit?: number;
}

export const tarefasService = {
	async listarExecucoes(
		params?: ListarExecucoesParams,
	): Promise<{ execucoes: TarefaExecucao[] }> {
		const { data } = await api.get<{ execucoes: TarefaExecucao[] }>(
			"/tarefas/execucoes",
			{ params },
		);
		return data;
	},
};

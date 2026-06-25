import type { ConfiguracaoNotificacoes } from "@/model/configuracao-model.js";
import { CONFIGURACAO_NOTIFICACOES_PADRAO } from "@/worker/types.js";

function mesclarSecao<T extends Record<string, unknown>>(
	padrao: T,
	valor?: Partial<T>,
): T {
	if (!valor) return padrao;
	return { ...padrao, ...valor };
}

export function normalizarConfiguracaoNotificacoes(
	valor: unknown,
): ConfiguracaoNotificacoes {
	const dados =
		valor && typeof valor === "object"
			? (valor as Partial<ConfiguracaoNotificacoes>)
			: {};

	return {
		alertasFinanceiros: {
			vencimentoContas: mesclarSecao(
				CONFIGURACAO_NOTIFICACOES_PADRAO.alertasFinanceiros.vencimentoContas,
				dados.alertasFinanceiros?.vencimentoContas,
			),
			saldoBaixo: mesclarSecao(
				CONFIGURACAO_NOTIFICACOES_PADRAO.alertasFinanceiros.saldoBaixo,
				dados.alertasFinanceiros?.saldoBaixo,
			),
			transferenciasAcimaValor: mesclarSecao(
				CONFIGURACAO_NOTIFICACOES_PADRAO.alertasFinanceiros
					.transferenciasAcimaValor,
				dados.alertasFinanceiros?.transferenciasAcimaValor,
			),
			conciliacoesPendentes: mesclarSecao(
				CONFIGURACAO_NOTIFICACOES_PADRAO.alertasFinanceiros.conciliacoesPendentes,
				dados.alertasFinanceiros?.conciliacoesPendentes,
			),
		},
		notificacoesEmail: {
			relatoriosAutomaticos: mesclarSecao(
				CONFIGURACAO_NOTIFICACOES_PADRAO.notificacoesEmail.relatoriosAutomaticos,
				dados.notificacoesEmail?.relatoriosAutomaticos,
			),
			resumoMovimentacoes: mesclarSecao(
				CONFIGURACAO_NOTIFICACOES_PADRAO.notificacoesEmail.resumoMovimentacoes,
				dados.notificacoesEmail?.resumoMovimentacoes,
			),
			alertasVencimento: mesclarSecao(
				CONFIGURACAO_NOTIFICACOES_PADRAO.notificacoesEmail.alertasVencimento,
				dados.notificacoesEmail?.alertasVencimento,
			),
		},
	};
}

export function formatarDataIso(data: Date): string {
	return data.toISOString().slice(0, 10);
}

export function adicionarDias(data: Date, dias: number): Date {
	const resultado = new Date(data);
	resultado.setDate(resultado.getDate() + dias);
	return resultado;
}

export type FrequenciaAgendamento = "diario" | "semanal" | "mensal" | null;

export function deveExecutarNoHorario(
	agora: Date,
	frequencia: FrequenciaAgendamento,
	horario: string,
): boolean {
	if (!frequencia) return false;

	const [horaStr, minutoStr] = horario.split(":");
	const horaAlvo = Number(horaStr ?? 8);
	const minutoAlvo = Number(minutoStr ?? 0);

	if (Number.isNaN(horaAlvo) || Number.isNaN(minutoAlvo)) {
		return false;
	}

	const minutosAtuais = agora.getHours() * 60 + agora.getMinutes();
	const minutosAlvo = horaAlvo * 60 + minutoAlvo;

	if (minutosAtuais < minutosAlvo || minutosAtuais >= minutosAlvo + 5) {
		return false;
	}

	if (frequencia === "diario") {
		return true;
	}

	if (frequencia === "semanal") {
		return agora.getDay() === 1;
	}

	return agora.getDate() === 1;
}

import { z } from "zod/v4";
import { buscarEmpresaPorId } from "@/repositories/empresa-repositories.js";
import {
	buscarDadosDashboardService,
	buscarHistoricoFinanceiroService,
} from "@/service/dashboard/buscar-dados-dashboard.js";
import { buscarUltimasMovimentacoesService } from "@/service/dashboard/buscar-ultimas-movimentacoes.js";
import type { DefinicaoTool } from "./tipos.js";
import { httpParaResultadoTool } from "./util-tools.js";

export const toolsDashboard: DefinicaoTool[] = [
	{
		nome: "consultar_dashboard",
		descricao:
			"Consulta resumo financeiro do dashboard (saldos, contas a pagar/receber e últimas movimentações).",
		mutavel: false,
		schema: z.object({}),
		executar: async (ctx) => {
			const [dados, historico, movimentacoes, empresa] = await Promise.all([
				buscarDadosDashboardService({
					idusuario: ctx.idusuario,
					idempresa: ctx.idempresa,
				}),
				buscarHistoricoFinanceiroService({
					idusuario: ctx.idusuario,
					idempresa: ctx.idempresa,
					dias: 30,
				}),
				buscarUltimasMovimentacoesService({
					idusuario: ctx.idusuario,
					idempresa: ctx.idempresa,
				}),
				buscarEmpresaPorId(ctx.idempresa),
			]);

			if (!dados.success) {
				return httpParaResultadoTool(dados, () => "");
			}

			const d = dados.body;
			const resumo = {
				empresa: empresa?.nome ?? null,
				totalContasPagar: d?.totalContasPagar,
				totalContasReceber: d?.totalContasReceber,
				saldoBancario: d?.saldoBancario,
				saldoCaixa: d?.saldoCaixa,
				historicoUltimosDias: historico.success
					? (historico.body ?? []).slice(0, 7)
					: [],
				ultimasPagar: movimentacoes.success
					? (movimentacoes.body?.pagar ?? []).slice(0, 5)
					: [],
				ultimasReceber: movimentacoes.success
					? (movimentacoes.body?.receber ?? []).slice(0, 5)
					: [],
			};

			return {
				ok: true,
				resumo: `Dashboard de ${resumo.empresa ?? "empresa"}: pagar R$ ${resumo.totalContasPagar ?? "0"}, receber R$ ${resumo.totalContasReceber ?? "0"}, banco R$ ${resumo.saldoBancario ?? "0"}, caixa R$ ${resumo.saldoCaixa ?? "0"}.`,
				dados: resumo,
			};
		},
	},
];

import { v4 as uuidv4 } from "uuid";
import { z } from "zod/v4";
import type { Automacao } from "@/repositories/automacao-repositories.js";
import { listarAutomacoesService } from "@/service/automacao/crud-automacao.js";
import {
	executarEnvioFiscalContabilidade,
	FUNCAO_ENVIO_FISCAL_CONTABILIDADE,
} from "@/service/automacao/funcoes/envio-fiscal-contabilidade.js";
import type { DefinicaoTool } from "./tipos.js";
import { exigirConfirmacao, httpParaResultadoTool } from "./util-tools.js";

function montarAutomacaoEnvio(
	idempresa: string,
	existente: Automacao | undefined,
	parametros: {
		incluirSintegra?: boolean;
		incluirXml?: boolean;
	},
): Automacao {
	const agora = new Date().toISOString();
	if (existente) {
		return {
			...existente,
			parametros: {
				...(existente.parametros ?? {}),
				...parametros,
			},
		};
	}

	return {
		id: uuidv4(),
		idempresa,
		nome: "Envio fiscal (via Atena)",
		funcao: FUNCAO_ENVIO_FISCAL_CONTABILIDADE,
		ativo: true,
		recorrencia: "mensal",
		horario: "08:00",
		diames: 1,
		diasemana: null,
		parametros: {
			incluirSintegra: parametros.incluirSintegra !== false,
			incluirXml: parametros.incluirXml !== false,
		},
		proximaexecucao: null,
		ultimaexecucao: null,
		statusultima: null,
		criadoem: agora,
		atualizadoem: agora,
	};
}

export const toolsContabilidade: DefinicaoTool[] = [
	{
		nome: "enviar_docs_contabilidade",
		descricao:
			"Envia documentos fiscais (XML e/ou SINTEGRA) do mês anterior para o e-mail da contabilidade. Exige confirmado=true. Bloqueia se houver NFC-e pendente no período.",
		mutavel: true,
		schema: z.object({
			confirmado: z.boolean().describe("true após confirmação do usuário"),
			incluirSintegra: z.boolean().optional().describe("Padrão true"),
			incluirXml: z.boolean().optional().describe("Padrão true"),
		}),
		executar: async (ctx, args) => {
			const bloqueio = exigirConfirmacao(args);
			if (bloqueio) return bloqueio;

			const { incluirSintegra, incluirXml } = args as {
				incluirSintegra?: boolean;
				incluirXml?: boolean;
			};

			const lista = await listarAutomacoesService({
				idusuario: ctx.idusuario,
				idempresa: ctx.idempresa,
			});

			if (!lista.success) {
				return httpParaResultadoTool(lista, () => "");
			}

			const existente = (lista.body ?? []).find(
				(a) => a.funcao === FUNCAO_ENVIO_FISCAL_CONTABILIDADE,
			);

			const automacao = montarAutomacaoEnvio(ctx.idempresa, existente, {
				...(incluirSintegra !== undefined ? { incluirSintegra } : {}),
				...(incluirXml !== undefined ? { incluirXml } : {}),
			});

			const resultado = await executarEnvioFiscalContabilidade(automacao);
			return httpParaResultadoTool(resultado, (body) => {
				const r = body as {
					status?: string;
					mensagem?: string;
				};
				return `Envio contábil: ${r?.status ?? "-"} — ${r?.mensagem ?? "sem mensagem"}`;
			});
		},
	},
];

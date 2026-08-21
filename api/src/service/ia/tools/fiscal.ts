import { z } from "zod/v4";
import { listarNfcePendentesService } from "@/service/nfce-emissao/listar-nfce-pendentes.js";
import { consultarStatusSefazService } from "@/service/nfe-emissao/consultar-status-sefaz.js";
import type { DefinicaoTool } from "./tipos.js";
import { httpParaResultadoTool } from "./util-tools.js";

export const toolsFiscal: DefinicaoTool[] = [
	{
		nome: "consultar_status_sefaz",
		descricao: "Consulta o status do serviço da SEFAZ para NF-e da empresa.",
		mutavel: false,
		schema: z.object({}),
		executar: async (ctx) => {
			const resultado = await consultarStatusSefazService({
				idempresa: ctx.idempresa,
				idusuario: ctx.idusuario,
			});
			return httpParaResultadoTool(resultado, (body) => {
				const r = body as {
					cStat?: string;
					xMotivo?: string;
					pendencias?: Array<{ codigo: string; mensagem: string }>;
				};
				const pend =
					r.pendencias && r.pendencias.length > 0
						? ` Pendências: ${r.pendencias.map((p) => p.mensagem).join("; ")}`
						: "";
				return `SEFAZ cStat=${r.cStat ?? "-"} motivo=${r.xMotivo ?? "-"}.${pend}`;
			});
		},
	},
	{
		nome: "listar_nfce_pendentes",
		descricao: "Lista NFC-e pendentes de transmissão/autorização na empresa.",
		mutavel: false,
		schema: z.object({
			limit: z.number().int().min(1).max(50).optional(),
		}),
		executar: async (ctx, args) => {
			const { limit } = args as { limit?: number };
			const resultado = await listarNfcePendentesService({
				idusuario: ctx.idusuario,
				idempresa: ctx.idempresa,
				page: 1,
				limit: limit ?? 20,
			});
			return httpParaResultadoTool(resultado, (body) => {
				const pagina = body as {
					data?: Array<{
						id?: string;
						numero?: number | null;
						serie?: number | null;
						chave?: string | null;
						status?: number | null;
					}>;
					paginacao?: { total: number };
				};
				const itens = pagina.data ?? [];
				if (itens.length === 0) return "Nenhuma NFC-e pendente.";
				const lista = itens
					.map(
						(n) =>
							`- id=${n.id} nº=${n.numero ?? "-"} série=${n.serie ?? "-"} chave=${n.chave ?? "-"}`,
					)
					.join("\n");
				return `${pagina.paginacao?.total ?? itens.length} NFC-e pendente(s):\n${lista}`;
			});
		},
	},
];

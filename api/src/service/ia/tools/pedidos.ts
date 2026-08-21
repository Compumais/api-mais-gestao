import { v4 as uuidv4 } from "uuid";
import { z } from "zod/v4";
import { buscarDavService } from "@/service/dav/buscar-dav.js";
import { criarDavService } from "@/service/dav/criar-dav.js";
import { listarDavsService } from "@/service/dav/listar-davs.js";
import { faturarDavNfceService } from "@/service/dav/faturar-dav-nfce.js";
import { faturarDavNfeService } from "@/service/dav/faturar-dav-nfe.js";
import type { DefinicaoTool } from "./tipos.js";
import { exigirConfirmacao, httpParaResultadoTool } from "./util-tools.js";

export const toolsPedidos: DefinicaoTool[] = [
	{
		nome: "listar_pedidos",
		descricao:
			"Lista pedidos (DAV) da empresa. Pode filtrar por status, código ou período.",
		mutavel: false,
		schema: z.object({
			codigo: z.number().optional().describe("Código numérico do pedido"),
			status: z
				.number()
				.optional()
				.describe("0 Aberto; 1 Fechado; 2 Caixa; 3 Cancelado; 4 NF gerada"),
			dataInicio: z.string().optional().describe("YYYY-MM-DD"),
			dataFim: z.string().optional().describe("YYYY-MM-DD"),
			limit: z.number().int().min(1).max(50).optional(),
		}),
		executar: async (ctx, args) => {
			const { codigo, status, dataInicio, dataFim, limit } = args as {
				codigo?: number;
				status?: number;
				dataInicio?: string;
				dataFim?: string;
				limit?: number;
			};
			const resultado = await listarDavsService({
				idusuario: ctx.idusuario,
				idempresa: ctx.idempresa,
				page: 1,
				limit: limit ?? 10,
				...(codigo !== undefined ? { codigo } : {}),
				...(status !== undefined ? { status } : {}),
				...(dataInicio ? { dataInicio } : {}),
				...(dataFim ? { dataFim } : {}),
			});
			return httpParaResultadoTool(resultado, (body) => {
				const pagina = body as {
					data?: Array<{
						id: string;
						codigo?: number | null;
						nomecliente?: string | null;
						total?: string | null;
						status?: number | null;
					}>;
					paginacao?: { total: number };
				};
				const itens = pagina.data ?? [];
				if (itens.length === 0) return "Nenhum pedido encontrado.";
				const lista = itens
					.map(
						(d) =>
							`- Pedido #${d.codigo ?? "?"} id=${d.id} cliente=${d.nomecliente ?? "-"} total=${d.total ?? "-"} status=${d.status ?? "-"}`,
					)
					.join("\n");
				return `Encontrados ${pagina.paginacao?.total ?? itens.length} pedido(s):\n${lista}`;
			});
		},
	},
	{
		nome: "buscar_pedido",
		descricao: "Busca um pedido (DAV) pelo ID UUID.",
		mutavel: false,
		schema: z.object({
			iddav: z.string().uuid().describe("ID do pedido (UUID)"),
		}),
		executar: async (ctx, args) => {
			const { iddav } = args as { iddav: string };
			const resultado = await buscarDavService({
				davId: iddav,
				idusuario: ctx.idusuario,
			});
			return httpParaResultadoTool(resultado, (body) => {
				const dav = body as {
					id?: string;
					codigo?: number | null;
					nomecliente?: string | null;
					total?: string | null;
					status?: number | null;
					idempresa?: string;
				};
				if (dav?.idempresa && dav.idempresa !== ctx.idempresa) {
					return "Pedido não pertence à empresa atual.";
				}
				return `Pedido #${dav?.codigo ?? "?"} id=${dav?.id} cliente=${dav?.nomecliente ?? "-"} total=${dav?.total ?? "-"} status=${dav?.status ?? "-"}`;
			});
		},
	},
	{
		nome: "criar_pedido",
		descricao:
			"Cria um pedido (DAV) básico vinculado a um cliente. Exige confirmado=true. Itens devem ser adicionados depois na tela de pedidos se necessário.",
		mutavel: true,
		schema: z.object({
			idcliente: z.string().uuid().describe("ID do cliente (entidade)"),
			observacao: z.string().optional().describe("Observação do pedido"),
			confirmado: z.boolean().describe("true após confirmação do usuário"),
		}),
		executar: async (ctx, args) => {
			const bloqueio = exigirConfirmacao(args);
			if (bloqueio) return bloqueio;

			const { idcliente, observacao } = args as {
				idcliente: string;
				observacao?: string;
			};
			const agora = new Date().toISOString();
			const resultado = await criarDavService({
				idusuario: ctx.idusuario,
				dadosDav: {
					id: uuidv4(),
					idempresa: ctx.idempresa,
					idcliente,
					data: agora.slice(0, 10),
					datainclusao: agora,
					status: 0,
					observacao: observacao ?? null,
				},
			});
			return httpParaResultadoTool(resultado, (body) => {
				const dav = body as { id?: string; codigo?: number | null };
				return `Pedido criado #${dav?.codigo ?? "?"} (id ${dav?.id}).`;
			});
		},
	},
	{
		nome: "faturar_pedido_nfe",
		descricao:
			"Fatura um pedido existente gerando NF-e. Exige confirmado=true e o iddav correto.",
		mutavel: true,
		schema: z.object({
			iddav: z.string().uuid().describe("ID do pedido"),
			confirmado: z.boolean().describe("true após confirmação explícita"),
			confirmarProducao: z
				.boolean()
				.optional()
				.describe("true para confirmar emissão em produção"),
		}),
		executar: async (ctx, args) => {
			const bloqueio = exigirConfirmacao(args);
			if (bloqueio) return bloqueio;

			const { iddav, confirmarProducao } = args as {
				iddav: string;
				confirmarProducao?: boolean;
			};
			const resultado = await faturarDavNfeService({
				idusuario: ctx.idusuario,
				iddav,
				idempresa: ctx.idempresa,
				confirmarProducao: confirmarProducao === true,
			});
			return httpParaResultadoTool(resultado, (body) => {
				const r = body as {
					idnotafiscal?: string;
					chave?: string | null;
					cStat?: string | null;
					xMotivo?: string | null;
				};
				return `NF-e processada. Nota=${r?.idnotafiscal ?? "-"} chave=${r?.chave ?? "-"} cStat=${r?.cStat ?? "-"} ${r?.xMotivo ?? ""}`.trim();
			});
		},
	},
	{
		nome: "faturar_pedido_nfce",
		descricao:
			"Fatura um pedido existente gerando NFC-e. Exige confirmado=true e o iddav correto.",
		mutavel: true,
		schema: z.object({
			iddav: z.string().uuid().describe("ID do pedido"),
			confirmado: z.boolean().describe("true após confirmação explícita"),
		}),
		executar: async (ctx, args) => {
			const bloqueio = exigirConfirmacao(args);
			if (bloqueio) return bloqueio;

			const { iddav } = args as { iddav: string };
			const resultado = await faturarDavNfceService({
				idusuario: ctx.idusuario,
				iddav,
				idempresa: ctx.idempresa,
			});
			return httpParaResultadoTool(resultado, (body) => {
				const r = body as {
					emitida?: boolean;
					idnotafiscal?: string | null;
					chave?: string | null;
					cStat?: string | null;
					xMotivo?: string | null;
					erro?: string | null;
				};
				if (r?.erro) return `NFC-e falhou: ${r.erro}`;
				return `NFC-e ${r?.emitida ? "emitida" : "processada"}. Nota=${r?.idnotafiscal ?? "-"} chave=${r?.chave ?? "-"} cStat=${r?.cStat ?? "-"} ${r?.xMotivo ?? ""}`.trim();
			});
		},
	},
];

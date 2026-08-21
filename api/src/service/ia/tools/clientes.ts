import { v4 as uuidv4 } from "uuid";
import { z } from "zod/v4";
import { consultarCnpjEntidadeService } from "@/service/entidades/consultar-cnpj-entidade.js";
import { criarEntidadeService } from "@/service/entidades/criar-entidade.js";
import { criarEntidadePorCnpjService } from "@/service/entidades/criar-entidade-por-cnpj.js";
import { listarEntidadesService } from "@/service/entidades/listar-entidades.js";
import type { DefinicaoTool } from "./tipos.js";
import { exigirConfirmacao, httpParaResultadoTool } from "./util-tools.js";

export const toolsClientes: DefinicaoTool[] = [
	{
		nome: "consultar_cnpj",
		descricao:
			"Consulta dados de um CNPJ na API externa e verifica se já está cadastrado na empresa.",
		mutavel: false,
		schema: z.object({
			cnpj: z.string().describe("CNPJ com ou sem máscara"),
		}),
		executar: async (ctx, args) => {
			const { cnpj } = args as { cnpj: string };
			const resultado = await consultarCnpjEntidadeService({
				cnpj,
				idempresa: ctx.idempresa,
			});
			return httpParaResultadoTool(resultado, (body) => {
				const dados = body as {
					entidade?: { nome?: string | null; razaosocial?: string | null };
					jaCadastrada?: { id: string } | null;
				};
				const nome =
					dados.entidade?.nome || dados.entidade?.razaosocial || "empresa";
				if (dados.jaCadastrada?.id) {
					return `CNPJ encontrado: ${nome}. Já cadastrado (id ${dados.jaCadastrada.id}).`;
				}
				return `CNPJ encontrado: ${nome}. Ainda não cadastrado na empresa.`;
			});
		},
	},
	{
		nome: "criar_cliente_pj_cnpj",
		descricao:
			"Cria cliente pessoa jurídica a partir do CNPJ (consulta automática). Exige confirmado=true após o usuário aceitar os dados.",
		mutavel: true,
		schema: z.object({
			cnpj: z.string().describe("CNPJ com ou sem máscara"),
			confirmado: z
				.boolean()
				.describe("true apenas após confirmação explícita do usuário"),
		}),
		executar: async (ctx, args) => {
			const bloqueio = exigirConfirmacao(args);
			if (bloqueio) return bloqueio;

			const { cnpj } = args as { cnpj: string };
			const resultado = await criarEntidadePorCnpjService({
				cnpj,
				idempresa: ctx.idempresa,
				idusuario: ctx.idusuario,
				cliente: 1,
			});
			return httpParaResultadoTool(resultado, (body) => {
				const entidade = body as { id?: string; nome?: string | null };
				return `Cliente PJ criado: ${entidade?.nome ?? "sem nome"} (id ${entidade?.id}).`;
			});
		},
	},
	{
		nome: "criar_cliente_pf",
		descricao:
			"Cria cliente pessoa física. Exige confirmado=true após o usuário confirmar nome e CPF.",
		mutavel: true,
		schema: z.object({
			nome: z.string().min(1).describe("Nome completo"),
			cpf: z.string().describe("CPF com ou sem máscara"),
			email: z.string().optional().describe("E-mail opcional"),
			telefone: z.string().optional().describe("Telefone opcional"),
			confirmado: z
				.boolean()
				.describe("true apenas após confirmação explícita do usuário"),
		}),
		executar: async (ctx, args) => {
			const bloqueio = exigirConfirmacao(args);
			if (bloqueio) return bloqueio;

			const { nome, cpf, email, telefone } = args as {
				nome: string;
				cpf: string;
				email?: string;
				telefone?: string;
			};
			const agora = new Date().toISOString();
			const resultado = await criarEntidadeService({
				idusuario: ctx.idusuario,
				dadosEntidade: {
					id: uuidv4(),
					idempresa: ctx.idempresa,
					nome,
					cnpjcpf: cpf.replace(/\D/g, ""),
					tipopessoa: 0,
					cliente: 1,
					fornecedor: 0,
					transportador: 0,
					representante: 0,
					email: email ?? null,
					telefone: telefone ?? null,
					criadoem: agora,
					atualizadoem: agora,
				},
			});
			return httpParaResultadoTool(resultado, (body) => {
				const entidade = body as { id?: string; nome?: string | null };
				return `Cliente PF criado: ${entidade?.nome ?? nome} (id ${entidade?.id}).`;
			});
		},
	},
	{
		nome: "buscar_clientes",
		descricao: "Lista clientes da empresa por nome ou texto de busca.",
		mutavel: false,
		schema: z.object({
			busca: z.string().optional().describe("Nome ou trecho para filtrar"),
			limit: z.number().int().min(1).max(50).optional().describe("Limite (máx 50)"),
		}),
		executar: async (ctx, args) => {
			const { busca, limit } = args as { busca?: string; limit?: number };
			const resultado = await listarEntidadesService({
				idusuario: ctx.idusuario,
				idempresa: ctx.idempresa,
				cliente: 1,
				...(busca ? { q: busca, nome: busca } : {}),
				page: 1,
				limit: limit ?? 10,
			});
			return httpParaResultadoTool(resultado, (body) => {
				const pagina = body as {
					data?: Array<{ id: string; nome: string | null; cnpjcpf: string | null }>;
					paginacao?: { total: number };
				};
				const itens = pagina.data ?? [];
				if (itens.length === 0) {
					return "Nenhum cliente encontrado.";
				}
				const lista = itens
					.map((e) => `- ${e.nome} (${e.cnpjcpf ?? "sem doc"}) id=${e.id}`)
					.join("\n");
				return `Encontrados ${pagina.paginacao?.total ?? itens.length} cliente(s):\n${lista}`;
			});
		},
	},
];

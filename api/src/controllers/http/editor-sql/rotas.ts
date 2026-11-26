import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	obterIdEmpresaDoContexto,
	resolveEmpresaContext,
} from "@/controllers/middleware/resolve-empresa-context.js";
import { verifyJwt } from "@/controllers/middleware/verify-jwt.js";
import { executarConsultaSqlService } from "@/service/editor-sql/executar-consulta-sql.js";
import {
	atualizarConsultaBiService,
	atualizarWidgetBiService,
	criarConsultaBiService,
	criarWidgetBiService,
	excluirConsultaBiService,
	excluirWidgetBiService,
	executarWidgetBiService,
	instalarWidgetDoCatalogoService,
	listarCatalogoBiService,
	listarConsultasBiService,
	listarWidgetsBiService,
	obterDashboardPersonalizadoService,
	obterSchemaBiService,
	salvarDashboardLayoutService,
} from "@/service/editor-sql/gerenciar-bi.js";
import { normalizarPerfilArray } from "@/util/usuario-perfil.js";

const PERFIS_ADMIN_BI = new Set(["proprietario", "admin", "super"]);

function verificarPerfilAdminBi(
	request: FastifyRequest,
	reply: FastifyReply,
): boolean {
	const perfis = normalizarPerfilArray(request.user?.roles);
	const autorizado = perfis.some((p) => PERFIS_ADMIN_BI.has(p));
	if (!autorizado) {
		reply.status(403).send({
			error: "Apenas proprietário ou administrador pode acessar o Editor SQL.",
			code: "FORBIDDEN_ERROR",
		});
		return false;
	}
	return true;
}

function exigirEmpresa(
	request: FastifyRequest,
	reply: FastifyReply,
): string | null {
	const idempresa = obterIdEmpresaDoContexto(request);
	if (!idempresa) {
		reply.status(400).send({
			error: "Header x-empresa-id é obrigatório.",
			code: "EMPRESA_OBRIGATORIA",
		});
		return null;
	}
	return idempresa;
}

const tipoGraficoSchema = z.enum([
	"kpi",
	"barra",
	"linha",
	"area",
	"pizza",
	"tabela",
]);

const mapeamentoSchema = z.object({
	eixoX: z.string().optional(),
	colunaValor: z.string().optional(),
	formato: z.enum(["moeda", "numero", "percentual"]).optional(),
	series: z
		.array(
			z.object({
				coluna: z.string().min(1),
				label: z.string().optional(),
				cor: z.string().optional(),
			}),
		)
		.optional(),
});

const executarSqlBodySchema = z.object({
	sql: z.string().min(1),
	parametros: z.record(z.string(), z.unknown()).optional(),
	limiteLinhas: z.number().int().min(1).max(1000).optional(),
});

const criarConsultaBodySchema = z.object({
	nome: z.string().min(1).max(120),
	descricao: z.string().max(500).nullable().optional(),
	sql: z.string().min(1),
});

const atualizarConsultaBodySchema = z.object({
	nome: z.string().min(1).max(120).optional(),
	descricao: z.string().max(500).nullable().optional(),
	sql: z.string().min(1).optional(),
});

const criarWidgetBodySchema = z.object({
	idconsulta: z.string().uuid().optional(),
	sql: z.string().min(1).optional(),
	nomeConsulta: z.string().max(120).optional(),
	titulo: z.string().min(1).max(120),
	subtitulo: z.string().max(200).nullable().optional(),
	tipografico: tipoGraficoSchema,
	mapeamento: mapeamentoSchema.default({}),
	cachettlsegundos: z.number().int().min(30).max(3600).optional(),
	adicionarAoDashboard: z.boolean().optional(),
	colSpan: z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(12)]).optional(),
});

const atualizarWidgetBodySchema = z.object({
	titulo: z.string().min(1).max(120).optional(),
	subtitulo: z.string().max(200).nullable().optional(),
	tipografico: tipoGraficoSchema.optional(),
	mapeamento: mapeamentoSchema.optional(),
	cachettlsegundos: z.number().int().min(30).max(3600).optional(),
});

const salvarLayoutBodySchema = z.object({
	nome: z.string().min(1).max(100).optional(),
	itens: z.array(
		z.object({
			widgetId: z.string().uuid(),
			ordem: z.number().int().min(0),
			colSpan: z.union([
				z.literal(4),
				z.literal(6),
				z.literal(8),
				z.literal(12),
			]),
		}),
	),
});

const executarWidgetBodySchema = z.object({
	parametros: z.record(z.string(), z.unknown()).optional(),
	forcarAtualizacao: z.boolean().optional(),
});

function responderHttp(
	reply: FastifyReply,
	res: { success: boolean; status: number; body?: unknown; error?: string; code?: string },
) {
	if (!res.success) {
		return reply.status(res.status).send({
			error: res.error ?? "Erro na requisição",
			code: res.code ?? "ERROR",
		});
	}
	return reply.status(res.status).send(res.body);
}

export async function editorSqlRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);
	app.addHook("preHandler", resolveEmpresaContext);

	// --- Leitura do Dashboard Personalizado (usuários autenticados da empresa) ---
	app.get("/editor-sql/dashboard-layout", async (request, reply) => {
		const idempresa = exigirEmpresa(request, reply);
		if (!idempresa) return;
		const res = await obterDashboardPersonalizadoService(idempresa);
		return responderHttp(reply, res);
	});

	app.post("/editor-sql/widgets/:id/executar", async (request, reply) => {
		const idempresa = exigirEmpresa(request, reply);
		if (!idempresa) return;
		const { id } = request.params as { id: string };
		const parsed = executarWidgetBodySchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.status(400).send({ error: "Parâmetros inválidos." });
		}
		const res = await executarWidgetBiService({
			idempresa,
			idusuario: request.user?.id,
			widgetId: id,
			parametros: parsed.data.parametros,
			forcarAtualizacao: parsed.data.forcarAtualizacao,
		});
		return responderHttp(reply, res);
	});

	// --- Rotas administrativas (proprietario / admin) ---

	app.get("/editor-sql/schema", async (request, reply) => {
		if (!verificarPerfilAdminBi(request, reply)) return;
		const res = await obterSchemaBiService();
		return responderHttp(reply, res);
	});

	app.get("/editor-sql/catalogo", async (request, reply) => {
		if (!verificarPerfilAdminBi(request, reply)) return;
		const res = await listarCatalogoBiService();
		return responderHttp(reply, res);
	});

	app.post("/editor-sql/executar", async (request, reply) => {
		if (!verificarPerfilAdminBi(request, reply)) return;
		const idempresa = exigirEmpresa(request, reply);
		if (!idempresa) return;
		const parsed = executarSqlBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "Informe uma consulta SQL válida.",
				issues: parsed.error.issues,
			});
		}
		const res = await executarConsultaSqlService({
			idempresa,
			idusuario: request.user?.id,
			sql: parsed.data.sql,
			parametros: parsed.data.parametros,
			limiteLinhas: parsed.data.limiteLinhas,
			origem: "editor",
		});
		return responderHttp(reply, res);
	});

	app.get("/editor-sql/consultas", async (request, reply) => {
		if (!verificarPerfilAdminBi(request, reply)) return;
		const idempresa = exigirEmpresa(request, reply);
		if (!idempresa) return;
		const res = await listarConsultasBiService(idempresa);
		return responderHttp(reply, res);
	});

	app.post("/editor-sql/consultas", async (request, reply) => {
		if (!verificarPerfilAdminBi(request, reply)) return;
		const idempresa = exigirEmpresa(request, reply);
		if (!idempresa) return;
		const parsed = criarConsultaBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({ error: "Dados da consulta inválidos." });
		}
		const res = await criarConsultaBiService({
			idempresa,
			idusuario: request.user!.id,
			...parsed.data,
		});
		return responderHttp(reply, res);
	});

	app.put("/editor-sql/consultas/:id", async (request, reply) => {
		if (!verificarPerfilAdminBi(request, reply)) return;
		const idempresa = exigirEmpresa(request, reply);
		if (!idempresa) return;
		const { id } = request.params as { id: string };
		const parsed = atualizarConsultaBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({ error: "Dados da consulta inválidos." });
		}
		const res = await atualizarConsultaBiService({
			idempresa,
			id,
			...parsed.data,
		});
		return responderHttp(reply, res);
	});

	app.delete("/editor-sql/consultas/:id", async (request, reply) => {
		if (!verificarPerfilAdminBi(request, reply)) return;
		const idempresa = exigirEmpresa(request, reply);
		if (!idempresa) return;
		const { id } = request.params as { id: string };
		const res = await excluirConsultaBiService(idempresa, id);
		return responderHttp(reply, res);
	});

	app.get("/editor-sql/widgets", async (request, reply) => {
		if (!verificarPerfilAdminBi(request, reply)) return;
		const idempresa = exigirEmpresa(request, reply);
		if (!idempresa) return;
		const res = await listarWidgetsBiService(idempresa);
		return responderHttp(reply, res);
	});

	app.post("/editor-sql/widgets", async (request, reply) => {
		if (!verificarPerfilAdminBi(request, reply)) return;
		const idempresa = exigirEmpresa(request, reply);
		if (!idempresa) return;
		const parsed = criarWidgetBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({ error: "Dados do widget inválidos." });
		}
		const res = await criarWidgetBiService({
			idempresa,
			idusuario: request.user!.id,
			...parsed.data,
		});
		return responderHttp(reply, res);
	});

	app.post("/editor-sql/widgets/catalogo/:codigo", async (request, reply) => {
		if (!verificarPerfilAdminBi(request, reply)) return;
		const idempresa = exigirEmpresa(request, reply);
		if (!idempresa) return;
		const { codigo } = request.params as { codigo: string };
		const res = await instalarWidgetDoCatalogoService({
			idempresa,
			idusuario: request.user!.id,
			codigo,
		});
		return responderHttp(reply, res);
	});

	app.put("/editor-sql/widgets/:id", async (request, reply) => {
		if (!verificarPerfilAdminBi(request, reply)) return;
		const idempresa = exigirEmpresa(request, reply);
		if (!idempresa) return;
		const { id } = request.params as { id: string };
		const parsed = atualizarWidgetBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({ error: "Dados do widget inválidos." });
		}
		const res = await atualizarWidgetBiService({
			idempresa,
			id,
			...parsed.data,
		});
		return responderHttp(reply, res);
	});

	app.delete("/editor-sql/widgets/:id", async (request, reply) => {
		if (!verificarPerfilAdminBi(request, reply)) return;
		const idempresa = exigirEmpresa(request, reply);
		if (!idempresa) return;
		const { id } = request.params as { id: string };
		const res = await excluirWidgetBiService(idempresa, id, request.user?.id);
		return responderHttp(reply, res);
	});

	app.put("/editor-sql/dashboard-layout", async (request, reply) => {
		if (!verificarPerfilAdminBi(request, reply)) return;
		const idempresa = exigirEmpresa(request, reply);
		if (!idempresa) return;
		const parsed = salvarLayoutBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({ error: "Layout inválido." });
		}
		const res = await salvarDashboardLayoutService({
			idempresa,
			idusuario: request.user!.id,
			...parsed.data,
		});
		return responderHttp(reply, res);
	});
}

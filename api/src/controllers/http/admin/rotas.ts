import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { buscarDashboardAdminService } from "@/service/admin/buscar-dashboard.js";
import {
	atualizarAjudaPostAdminService,
	criarAjudaPostAdminService,
	excluirAjudaPostAdminService,
	listarAjudaPostsAdminService,
} from "@/service/admin/gerenciar-ajuda-posts.js";
import {
	criarEmpresaAdminService,
	listarEmpresasAdminService,
} from "@/service/admin/gerenciar-empresas.js";
import {
	atualizarInformativoAdminService,
	criarInformativoAdminService,
	excluirInformativoAdminService,
	listarInformativosAdminService,
} from "@/service/admin/gerenciar-informativos.js";
import {
	atribuirEntitlementAdminService,
	atualizarModuloAdminService,
	atualizarPlanoAdminService,
	buscarEntitlementUsuarioAdminService,
	criarModuloAdminService,
	criarPlanoAdminService,
	listarCatalogoAdminService,
} from "@/service/admin/gerenciar-planos-saas.js";
import {
	alterarSenhaUsuarioAdminService,
	associarUsuarioEmpresaAdminService,
	ativarUsuarioAdminService,
	atualizarUsuarioAdminService,
	criarUsuarioAdminService,
	inativarUsuarioAdminService,
} from "@/service/admin/gerenciar-usuarios.js";
import { listarUsuariosAdminService } from "@/service/admin/listar-usuarios.js";
import { perfilUsuarioSchema } from "@/util/usuario-perfil.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { verifySuper } from "../../middleware/verify-super.js";

const IMAGEM_MAX_LENGTH = 700_000;

const imagemDataUrlSchema = z
	.string()
	.max(IMAGEM_MAX_LENGTH, "Imagem excede o tamanho máximo permitido")
	.refine((valor) => valor.startsWith("data:image/"), {
		message: "Imagem deve ser um data URL (data:image/...)",
	});

const ajudaPostBodySchema = z.object({
	titulo: z.string().min(1),
	subtitulo: z.string().nullable().optional(),
	descricao: z.string().min(1),
	capa: z.union([imagemDataUrlSchema, z.null()]).optional(),
	imagens: z.array(imagemDataUrlSchema).max(10).optional(),
	publicado: z.boolean().optional(),
});

const ajudaPostPatchSchema = z.object({
	titulo: z.string().min(1).optional(),
	subtitulo: z.string().nullable().optional(),
	descricao: z.string().min(1).optional(),
	capa: z.union([imagemDataUrlSchema, z.null()]).optional(),
	imagens: z.array(imagemDataUrlSchema).max(10).optional(),
	publicado: z.boolean().optional(),
});

async function enviarResultado(
	reply: FastifyReply,
	resultado: Awaited<ReturnType<typeof buscarDashboardAdminService>>,
) {
	if (!resultado.success) {
		return reply.status(resultado.status).send(resultado);
	}
	return reply.status(resultado.status).send(resultado.body);
}

export async function adminRotas(app: FastifyInstance) {
	app.addHook("onRequest", verifyJwt);
	app.addHook("onRequest", verifySuper);

	app.get("/admin/dashboard", async (_request, reply) => {
		return enviarResultado(reply, await buscarDashboardAdminService());
	});

	app.get("/admin/usuarios", async (request, reply) => {
		const query = z
			.object({
				nome: z.string().optional(),
				email: z.string().optional(),
				ativo: z
					.enum(["true", "false"])
					.optional()
					.transform((v) =>
						v === "true" ? true : v === "false" ? false : undefined,
					),
				page: z.coerce.number().min(1).default(1),
				limit: z.coerce.number().min(1).max(100).default(20),
			})
			.parse(request.query);

		return enviarResultado(
			reply,
			await listarUsuariosAdminService({
				page: query.page,
				limit: query.limit,
				...(query.nome && { nome: query.nome }),
				...(query.email && { email: query.email }),
				...(query.ativo !== undefined && { ativo: query.ativo }),
			}),
		);
	});

	app.post("/admin/usuarios", async (request, reply) => {
		const body = z
			.object({
				nome: z.string().min(3),
				email: z.string().email(),
				password: z.string().min(6),
				perfil: perfilUsuarioSchema,
				empresasIds: z.array(z.string().uuid()).optional(),
				plano: z.enum(["BASIC", "PREMIUM", "ENTERPRISE"]).nullable().optional(),
			})
			.parse(request.body);

		return enviarResultado(
			reply,
			await criarUsuarioAdminService({
				nome: body.nome,
				email: body.email,
				password: body.password,
				perfil: body.perfil,
				...(body.empresasIds && { empresasIds: body.empresasIds }),
				...(body.plano !== undefined && { plano: body.plano }),
			}),
		);
	});

	app.patch("/admin/usuarios/:id", async (request, reply) => {
		const params = z.object({ id: z.string() }).parse(request.params);
		const body = z
			.object({
				nome: z.string().min(3).optional(),
				email: z.string().email().optional(),
				perfil: perfilUsuarioSchema.optional(),
			})
			.parse(request.body);

		return enviarResultado(
			reply,
			await atualizarUsuarioAdminService({
				id: params.id,
				...(body.nome !== undefined && { nome: body.nome }),
				...(body.email !== undefined && { email: body.email }),
				...(body.perfil !== undefined && { perfil: body.perfil }),
			}),
		);
	});

	app.patch("/admin/usuarios/:id/senha", async (request, reply) => {
		const params = z.object({ id: z.string() }).parse(request.params);
		const body = z.object({ novaSenha: z.string().min(6) }).parse(request.body);

		return enviarResultado(
			reply,
			await alterarSenhaUsuarioAdminService({
				id: params.id,
				novaSenha: body.novaSenha,
			}),
		);
	});

	app.patch("/admin/usuarios/:id/inativar", async (request, reply) => {
		const params = z.object({ id: z.string() }).parse(request.params);
		return enviarResultado(
			reply,
			await inativarUsuarioAdminService({ id: params.id }),
		);
	});

	app.patch("/admin/usuarios/:id/ativar", async (request, reply) => {
		const params = z.object({ id: z.string() }).parse(request.params);
		return enviarResultado(
			reply,
			await ativarUsuarioAdminService({ id: params.id }),
		);
	});

	app.post("/admin/usuarios/:id/associar-empresa", async (request, reply) => {
		const params = z.object({ id: z.string() }).parse(request.params);
		const body = z
			.object({
				idempresa: z.string().uuid(),
				perfilNaEmpresa: perfilUsuarioSchema.optional(),
			})
			.parse(request.body);

		return enviarResultado(
			reply,
			await associarUsuarioEmpresaAdminService({
				idusuario: params.id,
				idempresa: body.idempresa,
				...(body.perfilNaEmpresa !== undefined && {
					perfilNaEmpresa: body.perfilNaEmpresa,
				}),
			}),
		);
	});

	app.get("/admin/empresas", async (_request, reply) => {
		return enviarResultado(reply, await listarEmpresasAdminService());
	});

	app.post("/admin/empresas", async (request: FastifyRequest, reply) => {
		if (!request.user) {
			return reply.status(401).send({ error: "Não autorizado" });
		}

		const body = z
			.object({
				nome: z.string().min(1),
				cnpj: z.string().min(11),
				telefone: z.string().min(8),
				email: z.string().email().optional(),
				endereco: z.string().optional(),
				idproprietario: z.string().optional(),
				idusuarioAssociado: z.string().optional(),
				perfilAssociado: perfilUsuarioSchema.optional(),
			})
			.parse(request.body);

		return enviarResultado(
			reply,
			await criarEmpresaAdminService({
				nome: body.nome,
				cnpj: body.cnpj,
				telefone: body.telefone,
				idSuperFallback: request.user.id,
				...(body.email !== undefined && { email: body.email }),
				...(body.endereco !== undefined && { endereco: body.endereco }),
				...(body.idproprietario !== undefined && {
					idproprietario: body.idproprietario,
				}),
				...(body.idusuarioAssociado !== undefined && {
					idusuarioAssociado: body.idusuarioAssociado,
				}),
				...(body.perfilAssociado !== undefined && {
					perfilAssociado: body.perfilAssociado,
				}),
			}),
		);
	});

	app.get("/admin/informativos", async (_request, reply) => {
		return enviarResultado(reply, await listarInformativosAdminService());
	});

	app.post("/admin/informativos", async (request, reply) => {
		const body = z
			.object({
				titulo: z.string().min(1),
				conteudo: z.string().min(1),
				publicado: z.boolean().optional(),
			})
			.parse(request.body);

		return enviarResultado(
			reply,
			await criarInformativoAdminService({
				titulo: body.titulo,
				conteudo: body.conteudo,
				...(body.publicado !== undefined && { publicado: body.publicado }),
			}),
		);
	});

	app.patch("/admin/informativos/:id", async (request, reply) => {
		const params = z.object({ id: z.string() }).parse(request.params);
		const body = z
			.object({
				titulo: z.string().min(1).optional(),
				conteudo: z.string().min(1).optional(),
				publicado: z.boolean().optional(),
			})
			.parse(request.body);

		return enviarResultado(
			reply,
			await atualizarInformativoAdminService(params.id, {
				...(body.titulo !== undefined && { titulo: body.titulo }),
				...(body.conteudo !== undefined && { conteudo: body.conteudo }),
				...(body.publicado !== undefined && { publicado: body.publicado }),
			}),
		);
	});

	app.delete("/admin/informativos/:id", async (request, reply) => {
		const params = z.object({ id: z.string() }).parse(request.params);
		return enviarResultado(
			reply,
			await excluirInformativoAdminService(params.id),
		);
	});

	app.get("/admin/ajuda-posts", async (_request, reply) => {
		return enviarResultado(reply, await listarAjudaPostsAdminService());
	});

	app.post("/admin/ajuda-posts", async (request, reply) => {
		if (!request.user) {
			return reply.status(401).send({
				error: "Não autorizado",
				code: "UNAUTHORIZED",
			});
		}

		const body = ajudaPostBodySchema.parse(request.body);

		return enviarResultado(
			reply,
			await criarAjudaPostAdminService({
				titulo: body.titulo,
				descricao: body.descricao,
				autorid: request.user.id,
				...(body.subtitulo !== undefined && { subtitulo: body.subtitulo }),
				...(body.capa !== undefined && { capa: body.capa }),
				...(body.imagens !== undefined && { imagens: body.imagens }),
				...(body.publicado !== undefined && { publicado: body.publicado }),
			}),
		);
	});

	app.patch("/admin/ajuda-posts/:id", async (request, reply) => {
		if (!request.user) {
			return reply.status(401).send({
				error: "Não autorizado",
				code: "UNAUTHORIZED",
			});
		}

		const params = z.object({ id: z.string() }).parse(request.params);
		const body = ajudaPostPatchSchema.parse(request.body);

		return enviarResultado(
			reply,
			await atualizarAjudaPostAdminService(params.id, {
				editorid: request.user.id,
				...(body.titulo !== undefined && { titulo: body.titulo }),
				...(body.subtitulo !== undefined && { subtitulo: body.subtitulo }),
				...(body.descricao !== undefined && { descricao: body.descricao }),
				...(body.capa !== undefined && { capa: body.capa }),
				...(body.imagens !== undefined && { imagens: body.imagens }),
				...(body.publicado !== undefined && { publicado: body.publicado }),
			}),
		);
	});

	app.delete("/admin/ajuda-posts/:id", async (request, reply) => {
		const params = z.object({ id: z.string() }).parse(request.params);
		return enviarResultado(
			reply,
			await excluirAjudaPostAdminService(params.id),
		);
	});

	app.get("/admin/planos-saas", async (_request, reply) => {
		return enviarResultado(reply, await listarCatalogoAdminService());
	});

	app.post("/admin/planos-saas", async (request, reply) => {
		const body = z
			.object({
				codigo: z.string().min(1).max(50),
				nome: z.string().min(1).max(100),
				descricao: z.string().nullable().optional(),
				valormensal: z.string().min(1),
				maxempresas: z.number().int().min(0),
				maxusuarios: z.number().int().min(0),
				ordem: z.number().int().default(0),
				ativo: z.boolean().optional(),
				idfeatures: z.array(z.string()).optional(),
			})
			.parse(request.body);

		return enviarResultado(
			reply,
			await criarPlanoAdminService({
				codigo: body.codigo,
				nome: body.nome,
				valormensal: body.valormensal,
				maxempresas: body.maxempresas,
				maxusuarios: body.maxusuarios,
				ordem: body.ordem,
				...(body.descricao !== undefined && { descricao: body.descricao }),
				...(body.ativo !== undefined && { ativo: body.ativo }),
				...(body.idfeatures !== undefined && { idfeatures: body.idfeatures }),
			}),
		);
	});

	app.patch("/admin/planos-saas/:id", async (request, reply) => {
		const params = z.object({ id: z.string() }).parse(request.params);
		const body = z
			.object({
				nome: z.string().min(1).optional(),
				descricao: z.string().nullable().optional(),
				valormensal: z.string().optional(),
				maxempresas: z.number().int().min(0).optional(),
				maxusuarios: z.number().int().min(0).optional(),
				ordem: z.number().int().optional(),
				ativo: z.boolean().optional(),
				idfeatures: z.array(z.string()).optional(),
			})
			.parse(request.body);

		return enviarResultado(
			reply,
			await atualizarPlanoAdminService({
				id: params.id,
				dados: body,
			}),
		);
	});

	app.post("/admin/modulos-saas", async (request, reply) => {
		const body = z
			.object({
				codigo: z.string().min(1).max(50),
				nome: z.string().min(1).max(100),
				descricao: z.string().nullable().optional(),
				valormensal: z.string().min(1),
				ativo: z.boolean().optional(),
			})
			.parse(request.body);

		return enviarResultado(
			reply,
			await criarModuloAdminService({
				codigo: body.codigo,
				nome: body.nome,
				valormensal: body.valormensal,
				...(body.descricao !== undefined && { descricao: body.descricao }),
				...(body.ativo !== undefined && { ativo: body.ativo }),
			}),
		);
	});

	app.patch("/admin/modulos-saas/:id", async (request, reply) => {
		const params = z.object({ id: z.string() }).parse(request.params);
		const body = z
			.object({
				nome: z.string().min(1).optional(),
				descricao: z.string().nullable().optional(),
				valormensal: z.string().optional(),
				ativo: z.boolean().optional(),
			})
			.parse(request.body);

		return enviarResultado(
			reply,
			await atualizarModuloAdminService({
				id: params.id,
				dados: body,
			}),
		);
	});

	app.get("/admin/usuarios/:id/entitlement", async (request, reply) => {
		const params = z.object({ id: z.string() }).parse(request.params);
		return enviarResultado(
			reply,
			await buscarEntitlementUsuarioAdminService(params.id),
		);
	});

	app.put("/admin/usuarios/:id/entitlement", async (request, reply) => {
		const params = z.object({ id: z.string() }).parse(request.params);
		const body = z
			.object({
				plano: z.string().min(1).nullable().optional(),
				modulos: z
					.array(
						z.object({
							codigo: z.string(),
							ativo: z.boolean(),
						}),
					)
					.optional(),
			})
			.parse(request.body);

		return enviarResultado(
			reply,
			await atribuirEntitlementAdminService({
				idusuario: params.id,
				...(body.plano !== undefined && { plano: body.plano }),
				...(body.modulos !== undefined && { modulos: body.modulos }),
			}),
		);
	});
}

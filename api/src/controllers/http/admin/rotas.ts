import type { FastifyInstance } from "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { verifySuper } from "../../middleware/verify-super.js";
import { buscarDashboardAdminService } from "@/service/admin/buscar-dashboard.js";
import {
	associarUsuarioEmpresaAdminService,
	atualizarUsuarioAdminService,
	alterarSenhaUsuarioAdminService,
	ativarUsuarioAdminService,
	criarUsuarioAdminService,
	inativarUsuarioAdminService,
} from "@/service/admin/gerenciar-usuarios.js";
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
import { listarUsuariosAdminService } from "@/service/admin/listar-usuarios.js";
import { perfilUsuarioSchema } from "@/util/usuario-perfil.js";

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
}

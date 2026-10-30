import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import {
	atualizarGrupoBancoService,
	atualizarProdutoBancoService,
	buscarBancoImagensService,
	buscarProdutoBancoService,
	criarGrupoBancoService,
	criarProdutoBancoService,
	ErroBancoImagem,
	excluirGrupoBancoService,
	excluirProdutoBancoService,
	lerImagemGrupoBancoService,
	lerImagemProdutoBancoService,
	listarGruposBancoService,
	listarProdutosBancoService,
	removerImagemGrupoBancoService,
	removerImagemProdutoBancoService,
	salvarImagemGrupoBancoService,
	salvarImagemProdutoBancoService,
} from "@/service/banco-imagem/gerenciar-banco-imagem.js";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { verifySuper } from "../../middleware/verify-super.js";

const LIMITE_IMAGEM = 5 * 1024 * 1024;
const UUID =
	":id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})";

const grupoBodySchema = z.object({
	nome: z.string().min(1).max(120),
	ordem: z.number().int().optional(),
	ativo: z.boolean().optional(),
});

const produtoBodySchema = z.object({
	idgrupo: z.uuid(),
	nome: z.string().min(1).max(160),
	ativo: z.boolean().optional(),
	codigos: z.array(z.string()).max(30).optional(),
});

const produtoPatchSchema = z.object({
	idgrupo: z.uuid().optional(),
	nome: z.string().min(1).max(160).optional(),
	ativo: z.boolean().optional(),
	codigos: z.array(z.string()).max(30).optional(),
});

function responderErro(erro: unknown, reply: FastifyReply) {
	if (erro instanceof ErroBancoImagem) {
		return reply.status(erro.status).send({
			error: erro.message,
			code: erro.codigo,
		});
	}
	if (erro instanceof z.ZodError) {
		return reply.status(400).send({
			error: "Erro de validação",
			code: "VALIDATION_ERROR",
			details: erro.issues,
		});
	}
	console.error(erro);
	return reply.status(500).send({
		error: "Erro interno",
		code: "INTERNAL_ERROR",
	});
}

function exigirBuffer(request: FastifyRequest) {
	if (!Buffer.isBuffer(request.body)) {
		throw new ErroBancoImagem(
			"Conteúdo da imagem não informado",
			400,
			"IMAGEM_AUSENTE",
		);
	}
	return request.body;
}

function nomeArquivo(request: FastifyRequest): string | undefined {
	return typeof request.headers["x-file-name"] === "string"
		? decodeURIComponent(request.headers["x-file-name"])
		: undefined;
}

function enviarArquivo(
	reply: FastifyReply,
	arquivo: { conteudo: Buffer; tipo: string; etag: string },
) {
	return reply
		.type(arquivo.tipo)
		.header("Cache-Control", "private, max-age=31536000, immutable")
		.header("ETag", `"${arquivo.etag}"`)
		.send(arquivo.conteudo);
}

export async function bancoImagemRotas(app: FastifyInstance) {
	app.addContentTypeParser(
		["image/jpeg", "image/png", "image/webp"],
		{ parseAs: "buffer", bodyLimit: LIMITE_IMAGEM },
		(_request, body, done) => done(null, body),
	);
	app.addHook("onRequest", verifyJwt);

	app.get("/banco-imagens/grupos", async (_request, reply) => {
		try {
			return reply.send(await listarGruposBancoService());
		} catch (erro) {
			return responderErro(erro, reply);
		}
	});

	app.post(
		"/banco-imagens/grupos",
		{ preHandler: verifySuper },
		async (request, reply) => {
			try {
				const body = grupoBodySchema.parse(request.body);
				const grupo = await criarGrupoBancoService(body);
				return reply.status(201).send(grupo);
			} catch (erro) {
				return responderErro(erro, reply);
			}
		},
	);

	app.put(
		`/banco-imagens/grupos/${UUID}`,
		{ preHandler: verifySuper },
		async (request, reply) => {
			try {
				const { id } = z.object({ id: z.uuid() }).parse(request.params);
				const body = grupoBodySchema.partial().parse(request.body);
				return reply.send(await atualizarGrupoBancoService({ id, ...body }));
			} catch (erro) {
				return responderErro(erro, reply);
			}
		},
	);

	app.delete(
		`/banco-imagens/grupos/${UUID}`,
		{ preHandler: verifySuper },
		async (request, reply) => {
			try {
				const { id } = z.object({ id: z.uuid() }).parse(request.params);
				await excluirGrupoBancoService(id);
				return reply.status(204).send();
			} catch (erro) {
				return responderErro(erro, reply);
			}
		},
	);

	app.get(`/banco-imagens/grupos/${UUID}/imagem`, async (request, reply) => {
		try {
			const { id } = z.object({ id: z.uuid() }).parse(request.params);
			return enviarArquivo(reply, await lerImagemGrupoBancoService(id));
		} catch (erro) {
			return responderErro(erro, reply);
		}
	});

	app.put(
		`/banco-imagens/grupos/${UUID}/imagem`,
		{ preHandler: verifySuper, bodyLimit: LIMITE_IMAGEM },
		async (request, reply) => {
			try {
				const { id } = z.object({ id: z.uuid() }).parse(request.params);
				const grupo = await salvarImagemGrupoBancoService({
					id,
					conteudo: exigirBuffer(request),
					tipoInformado: request.headers["content-type"]?.split(";")[0],
					nomeArquivo: nomeArquivo(request),
				});
				return reply.send(grupo);
			} catch (erro) {
				return responderErro(erro, reply);
			}
		},
	);

	app.delete(
		`/banco-imagens/grupos/${UUID}/imagem`,
		{ preHandler: verifySuper },
		async (request, reply) => {
			try {
				const { id } = z.object({ id: z.uuid() }).parse(request.params);
				return reply.send(await removerImagemGrupoBancoService(id));
			} catch (erro) {
				return responderErro(erro, reply);
			}
		},
	);

	app.get("/banco-imagens/produtos", async (request, reply) => {
		try {
			const query = z
				.object({ idgrupo: z.uuid().optional() })
				.parse(request.query);
			return reply.send(await listarProdutosBancoService(query.idgrupo));
		} catch (erro) {
			return responderErro(erro, reply);
		}
	});

	app.get("/banco-imagens/busca", async (request, reply) => {
		try {
			const query = z
				.object({
					q: z.string().optional(),
					codigo: z.string().optional(),
					idgrupo: z.uuid().optional(),
					limit: z.coerce.number().int().min(1).max(50).default(20),
				})
				.parse(request.query);
			return reply.send(
				await buscarBancoImagensService({
					texto: query.q,
					codigo: query.codigo,
					idgrupo: query.idgrupo,
					limite: query.limit,
				}),
			);
		} catch (erro) {
			return responderErro(erro, reply);
		}
	});

	app.post(
		"/banco-imagens/produtos",
		{ preHandler: verifySuper },
		async (request, reply) => {
			try {
				const body = produtoBodySchema.parse(request.body);
				const produto = await criarProdutoBancoService(body);
				return reply.status(201).send(produto);
			} catch (erro) {
				return responderErro(erro, reply);
			}
		},
	);

	app.get(`/banco-imagens/produtos/${UUID}`, async (request, reply) => {
		try {
			const { id } = z.object({ id: z.uuid() }).parse(request.params);
			return reply.send(await buscarProdutoBancoService(id));
		} catch (erro) {
			return responderErro(erro, reply);
		}
	});

	app.put(
		`/banco-imagens/produtos/${UUID}`,
		{ preHandler: verifySuper },
		async (request, reply) => {
			try {
				const { id } = z.object({ id: z.uuid() }).parse(request.params);
				const body = produtoPatchSchema.parse(request.body);
				return reply.send(await atualizarProdutoBancoService({ id, ...body }));
			} catch (erro) {
				return responderErro(erro, reply);
			}
		},
	);

	app.delete(
		`/banco-imagens/produtos/${UUID}`,
		{ preHandler: verifySuper },
		async (request, reply) => {
			try {
				const { id } = z.object({ id: z.uuid() }).parse(request.params);
				await excluirProdutoBancoService(id);
				return reply.status(204).send();
			} catch (erro) {
				return responderErro(erro, reply);
			}
		},
	);

	app.get(`/banco-imagens/${UUID}/imagem`, async (request, reply) => {
		try {
			const { id } = z.object({ id: z.uuid() }).parse(request.params);
			return enviarArquivo(reply, await lerImagemProdutoBancoService(id));
		} catch (erro) {
			return responderErro(erro, reply);
		}
	});

	app.put(
		`/banco-imagens/produtos/${UUID}/imagem`,
		{ preHandler: verifySuper, bodyLimit: LIMITE_IMAGEM },
		async (request, reply) => {
			try {
				const { id } = z.object({ id: z.uuid() }).parse(request.params);
				const produto = await salvarImagemProdutoBancoService({
					id,
					conteudo: exigirBuffer(request),
					tipoInformado: request.headers["content-type"]?.split(";")[0],
					nomeArquivo: nomeArquivo(request),
				});
				return reply.send(produto);
			} catch (erro) {
				return responderErro(erro, reply);
			}
		},
	);

	app.delete(
		`/banco-imagens/produtos/${UUID}/imagem`,
		{ preHandler: verifySuper },
		async (request, reply) => {
			try {
				const { id } = z.object({ id: z.uuid() }).parse(request.params);
				return reply.send(await removerImagemProdutoBancoService(id));
			} catch (erro) {
				return responderErro(erro, reply);
			}
		},
	);
}

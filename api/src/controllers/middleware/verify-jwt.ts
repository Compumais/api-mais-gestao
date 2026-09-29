import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import * as schema from "../../../drizzle/schema.js";
import { auth } from "../../lib/auth.js";
import { db } from "../../repositories/connection.js";
import { PDV_API_KEY_PREFIX } from "../../repositories/terminal-pdv-apikey.js";
import { resolverTerminalPorBearerApiKey } from "../../service/terminal-pdv/apikey-pdv.js";
import { normalizarPerfilArray } from "../../util/usuario-perfil.js";
import { verificarUsuarioPodeAcessarPlataforma } from "../../util/verificar-acesso-plataforma.js";
import { isSuper } from "../../util/verificar-super.js";

const ROTAS_SEM_VERIFICACAO_ACESSO = [
	"/health",
	"/docs",
	"/api/auth",
	"/pdv/updates",
	"/pdv/device/auth",
];

/**
 * Converte headers do Fastify para Headers do Web API
 */
function fastifyHeadersToWebHeaders(
	fastifyHeaders: FastifyRequest["headers"],
): Headers {
	const headers = new Headers();
	if (!fastifyHeaders || typeof fastifyHeaders !== "object") {
		return headers;
	}
	try {
		for (const [key, value] of Object.entries(fastifyHeaders)) {
			if (value) {
				if (Array.isArray(value)) {
					for (const v of value) {
						headers.append(key, v);
					}
				} else {
					headers.set(key, value.toString());
				}
			}
		}
	} catch (error) {
		console.warn("Erro ao processar headers:", error);
	}
	return headers;
}

function extractTokenFromHeader(
	authHeader: string | undefined,
): string | null | undefined {
	if (!authHeader) return null;

	const parts = authHeader.split(" ");

	if (parts.length !== 2 || parts[0] !== "Bearer") {
		return null;
	}

	return parts[1];
}

function extrairInstanceId(request: FastifyRequest): string | null {
	const raw = request.headers["x-pdv-instance-id"];
	const valor = Array.isArray(raw) ? raw[0] : raw;
	return valor?.trim() || null;
}

function deveIgnorarVerificacaoAcesso(url: string): boolean {
	const path = url.split("?")[0] ?? url;
	return ROTAS_SEM_VERIFICACAO_ACESSO.some((prefixo) =>
		path.startsWith(prefixo),
	);
}

async function validarAcessoPlataforma(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<boolean> {
	if (deveIgnorarVerificacaoAcesso(request.url)) {
		return true;
	}

	if (!request.user) {
		return true;
	}

	if (request.user.isPdvDevice) {
		return true;
	}

	if (isSuper(normalizarPerfilArray(request.user.roles))) {
		return true;
	}

	const resultado = await verificarUsuarioPodeAcessarPlataforma(
		request.user.id,
		normalizarPerfilArray(request.user.roles),
	);

	if (!resultado.permitido) {
		reply.status(403).send({
			error: resultado.motivo ?? "Acesso bloqueado",
			code: resultado.code ?? "ACCESS_DENIED",
		});
		return false;
	}

	return true;
}

/**
 * Middleware para verificar autenticação usando Better Auth
 * Aceita cookies, Bearer de sessão e API key de terminal PDV (`pdv_…`).
 */
export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
	try {
		const headers = fastifyHeadersToWebHeaders(request.headers);
		const session = await auth.api.getSession({ headers });

		if (!session?.user) {
			const authHeader = request.headers.authorization;
			const token = extractTokenFromHeader(authHeader);

			if (token?.startsWith(PDV_API_KEY_PREFIX)) {
				const resolvido = await resolverTerminalPorBearerApiKey({
					apiKey: token,
					instanceId: extrairInstanceId(request),
				});
				if (!resolvido.ok || !resolvido.terminal) {
					return reply.status(resolvido.ok ? 401 : resolvido.status).send({
						error: resolvido.ok ? "Não autorizado" : resolvido.error,
						code: resolvido.ok ? "UNAUTHORIZED" : resolvido.code,
					});
				}
				const terminal = resolvido.terminal;
				request.pdvTerminal = {
					id: terminal.id,
					idempresa: terminal.idempresa,
					numeropdv: terminal.numeropdv,
				};
				request.user = {
					id: `pdv-device:${terminal.id}`,
					name: terminal.descricao || `PDV ${terminal.numeropdv}`,
					email: undefined,
					roles: ["pdv"],
					isPdvDevice: true,
				};
				return;
			}

			if (token) {
				const sessionData = await db
					.select({
						id: schema.sessoes.id,
						token: schema.sessoes.token,
						idusuario: schema.sessoes.idusuario,
						expiraem: schema.sessoes.expiraem,
					})
					.from(schema.sessoes)
					.where(eq(schema.sessoes.token, token))
					.limit(1);

				if (sessionData.length > 0) {
					const sessao = sessionData[0];
					if (sessao?.expiraem && new Date(sessao.expiraem) > new Date()) {
						const usuario = await db
							.select({
								id: schema.usuarios.id,
								nome: schema.usuarios.nome,
								email: schema.usuarios.email,
								perfil: schema.usuarios.perfil,
								plano: schema.usuarios.plano,
								ativo: schema.usuarios.ativo,
							})
							.from(schema.usuarios)
							.where(eq(schema.usuarios.id, sessao.idusuario))
							.limit(1);

						if (usuario.length > 0) {
							const userData = usuario[0];
							const perfil = normalizarPerfilArray(userData?.perfil);

							request.user = {
								id: userData!.id,
								name: userData!.nome || "",
								email: userData!.email || "",
								roles: perfil.length > 0 ? perfil : ["usuario"],
								plano: userData!.plano || null,
							};
							const permitido = await validarAcessoPlataforma(request, reply);
							if (!permitido) return;
							return;
						}
					}
				}
			}
		} else {
			const usuario = await db
				.select({
					id: schema.usuarios.id,
					nome: schema.usuarios.nome,
					email: schema.usuarios.email,
					perfil: schema.usuarios.perfil,
					plano: schema.usuarios.plano,
				})
				.from(schema.usuarios)
				.where(eq(schema.usuarios.id, session.user.id))
				.limit(1);

			const userData = usuario[0];
			if (!userData) {
				return reply.status(401).send({
					error: "Usuário não encontrado",
					code: "UNAUTHORIZED",
				});
			}

			const perfil = normalizarPerfilArray(userData.perfil);

			request.user = {
				id: userData.id,
				name: userData.nome || "",
				email: userData.email,
				roles: perfil.length > 0 ? perfil : ["usuario"],
				plano: userData.plano || null,
			};

			const permitido = await validarAcessoPlataforma(request, reply);
			if (!permitido) return;

			return;
		}

		return reply.status(401).send({
			error: "Não autorizado",
			code: "UNAUTHORIZED",
		});
	} catch (err) {
		console.error("Erro ao verificar autenticação:", err);
		return reply.status(401).send({
			error: "Não autorizado",
			code: "UNAUTHORIZED",
		});
	}
}

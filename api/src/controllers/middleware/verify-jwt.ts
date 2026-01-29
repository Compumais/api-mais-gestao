import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import * as schema from "../../../drizzle/schema.js";
import { auth } from "../../lib/auth.js";
import { db } from "../../repositories/connection.js";

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
		// Se houver erro ao processar headers, retorna headers vazio
		console.warn("Erro ao processar headers:", error);
	}
	return headers;
}

/**
 * Extrai o token do header Authorization
 */
function extractTokenFromHeader(authHeader: string | undefined): string | null {
	if (!authHeader) return null;

	const parts = authHeader.split(" ");

	if (parts.length !== 2 || parts[0] !== "Bearer") {
		return null;
	}

	return parts[1];
}

/**
 * Middleware para verificar autenticação usando Better Auth
 * Aceita tanto cookies (padrão do Better Auth) quanto tokens JWT no header Authorization
 */
export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
	try {
		// Tenta primeiro usar cookies (padrão do Better Auth)
		const headers = fastifyHeadersToWebHeaders(request.headers);
		let session = await auth.api.getSession({ headers });

		// Se não houver sessão via cookies, tenta usar token do header Authorization
		if (!session?.user) {
			const authHeader = request.headers.authorization;
			const token = extractTokenFromHeader(authHeader);

			if (token) {
				// Busca a sessão pelo token no banco de dados
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
					// Verifica se a sessão não expirou
					if (sessao?.expiraem && new Date(sessao.expiraem) > new Date()) {
						// Busca os dados do usuário
						const usuario = await db
							.select({
								id: schema.usuarios.id,
								nome: schema.usuarios.nome,
								email: schema.usuarios.email,
								perfil: schema.usuarios.perfil,
							})
							.from(schema.usuarios)
							.where(eq(schema.usuarios.id, sessao.idusuario))
							.limit(1);

						if (usuario.length > 0) {
							const userData = usuario[0];
							// perfil pode ser um array JSONB ou uma string
							const perfilRaw: unknown = userData?.perfil;
							let perfil = "usuario";

							if (perfilRaw) {
								if (Array.isArray(perfilRaw) && perfilRaw.length > 0) {
									const firstElement = perfilRaw[0];
									if (typeof firstElement === "string") {
										perfil = firstElement;
									}
								} else if (typeof perfilRaw === "string") {
									perfil = perfilRaw;
								}
							}

							request.user = {
								id: userData?.id,
								name: userData?.nome || "",
								email: userData?.email,
								roles: perfil,
							};
							return; // Autenticação bem-sucedida
						}
					}
				}
			}
		} else {
			// Sessão encontrada via cookies
			// perfil pode ser um array JSONB ou uma string
			const perfilRaw: unknown = session.user.perfil;
			let perfil = "usuario";

			if (perfilRaw) {
				if (Array.isArray(perfilRaw) && perfilRaw.length > 0) {
					const firstElement = perfilRaw[0];
					if (typeof firstElement === "string") {
						perfil = firstElement;
					}
				} else if (typeof perfilRaw === "string") {
					perfil = perfilRaw;
				}
			}

			request.user = {
				id: session.user.id,
				name: session.user.name || "",
				email: session.user.email,
				roles: perfil,
			};
			return; // Autenticação bem-sucedida
		}

		// Se chegou aqui, não foi possível autenticar
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

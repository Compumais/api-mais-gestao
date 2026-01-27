import type { FastifyReply, FastifyRequest } from "fastify";
import { auth } from "../../lib/auth.js";

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
 * Middleware para verificar autenticação usando Better Auth
 * Verifica a sessão usando cookies (padrão do Better Auth)
 */
export async function verifyJwt(request: FastifyRequest, reply: FastifyReply) {
	try {
		// Converte headers do Fastify para formato esperado pelo Better Auth
		const headers = fastifyHeadersToWebHeaders(request.headers);

		// Verifica sessão usando cookies (padrão do Better Auth)
		const session = await auth.api.getSession({ headers });

		if (!session?.user) {
			return reply.status(401).send({
				error: "Não autorizado",
				code: "UNAUTHORIZED",
			});
		}

		// Extrai informações do usuário da sessão
		// Garante que os campos obrigatórios existam e permite adicionar mais informações futuramente
		request.user = {
			id: session.user.id,
			name: session.user.name || "",
			email: session.user.email,
			roles: session.user.perfil,
			// Permite adicionar mais informações do usuário futuramente
			// Adicione outros campos aqui conforme necessário
		};
	} catch (err) {
		console.error("Erro ao verificar autenticação:", err);
		return reply.status(401).send({
			error: "Não autorizado",
			code: "UNAUTHORIZED",
		});
	}
}

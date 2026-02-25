import type { FastifyReply, FastifyRequest } from "fastify";
import { verificarUsuarioEhProprietario } from "../../repositories/empresa-repositories.js";
import { buscarPlanoUsuario } from "../../repositories/usuarios-repositories.js";

/**
 * Middleware para verificar se o usuário possui um plano válido
 * IMPORTANTE: Apenas usuários com perfil "proprietario" (que são proprietários de empresas) precisam ter plano
 * Retorna 403 se o proprietário não tiver plano
 */
export async function verifyPlano(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!request.user) {
		return reply.status(401).send({
			error: "Não autorizado",
			code: "UNAUTHORIZED",
		});
	}

	// Verificar se o usuário é proprietário de alguma empresa
	const ehProprietario = await verificarUsuarioEhProprietario(request.user.id);

	// Se não for proprietário, não precisa verificar plano (pode acessar)
	if (!ehProprietario) {
		return; // Usuário não é proprietário, não precisa de plano
	}

	// Se for proprietário, verificar se tem plano
	const planoUsuario = await buscarPlanoUsuario(request.user.id);

	if (!planoUsuario || !planoUsuario.plano) {
		return reply.status(403).send({
			error: "Plano obrigatório",
			code: "PLANO_REQUIRED",
			message:
				"É necessário contratar um plano para acessar esta funcionalidade",
		});
	}

	// Proprietário possui plano válido, continuar
	return;
}

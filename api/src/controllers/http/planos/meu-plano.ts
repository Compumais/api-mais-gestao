import type { FastifyReply, FastifyRequest } from "fastify";
import { buscarPlanoUsuario } from "@/repositories/usuarios-repositories";

export async function getMeuPlanoController(
	request: FastifyRequest,
	reply: FastifyReply
) {
	if (!request.user) {
		return reply.status(401).send({ message: "Não autorizado" });
	}

	try {
		const planoUsuario = await buscarPlanoUsuario(request.user.id);

		if (!planoUsuario || !planoUsuario.plano) {
			return reply.status(200).send({
				plano: null,
				status: "SEM_PLANO",
				mensagem: "Usuário não possui plano ativo",
			});
		}

		return reply.status(200).send({
			plano: planoUsuario.plano,
			planoAgendado: planoUsuario.plano_proximo,
			inicioCiclo: planoUsuario.plano_inicio_ciclo,
			fimCiclo: planoUsuario.plano_fim_ciclo,
			status: "ACTIVE",
		});
	} catch (error: any) {
		console.error("Erro ao buscar plano do usuário:", error);
		return reply.status(500).send({
			message: "Erro ao buscar plano",
			error: error.message,
		});
	}
}


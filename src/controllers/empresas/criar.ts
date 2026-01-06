import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarEmpresaService } from "../../service/empresa/criar-empresa";
import { listarEmpresasService } from "../../service/empresa/listar-empresas";
import { buscarUsuarioPorIdService } from "../../service/usuarios/buscar";

const criarEmpresaSchema = z.object({
	nome: z.string(),
	cnpj: z.string(),
	email: z.string(),
	telefone: z.string(),
	endereco: z.string(),
});

export async function criarEmpresa(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(401).send({
				error: "Não autorizado",
				code: "UNAUTHORIZED",
			});
		}

		const usuarioId = request.user.id;
		const dadosValidados = criarEmpresaSchema.parse(request.body);
		const uuid = uuidv4();

		const usuario = await buscarUsuarioPorIdService(usuarioId);
		const empresasDoUsuario = await listarEmpresasService({
			proprietarioId: usuarioId,
		});

		if (
			usuario.maxCompanies &&
			usuario.maxCompanies >= empresasDoUsuario.length
		) {
			return reply.status(400).send({
				error: "Usuário já atingiu o limite de empresas",
				code: "MAX_COMPANIES_REACHED",
			});
		}

		const empresa = await criarEmpresaService({
			id: uuid,
			proprietarioId: usuarioId,
			nome: dadosValidados.nome,
			cnpj: dadosValidados.cnpj,
			telefone: dadosValidados.telefone,
			atualizadoEm: new Date().toISOString(),
			criadoEm: new Date().toISOString(),
		});

		return reply.status(201).send(empresa);
	} catch (error) {
		console.error(error);
		return reply.status(500).send({
			error: "Erro ao criar empresa",
			code: "CREATE_EMPRESA_ERROR",
		});
	}
}

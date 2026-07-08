import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarEmpresaService } from "../../../service/empresa/criar-empresa.js";
import { listarEmpresasService } from "../../../service/empresa/listar-empresas.js";
import { buscarUsuarioPorIdService } from "../../../service/usuarios/buscar.js";

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

		if (!usuario.success || !usuario.body) {
			return reply.status(usuario.status).send(usuario);
		}

		const empresasDoUsuario = await listarEmpresasService({
			idproprietario: usuarioId,
		});

		if (!empresasDoUsuario.success || !empresasDoUsuario.body) {
			return reply.status(empresasDoUsuario.status).send(empresasDoUsuario);
		}

		const dadosEmpresa = {
			id: uuid,
			idproprietario: usuarioId,
			nome: dadosValidados.nome,
			cnpj: dadosValidados.cnpj,
			telefone: dadosValidados.telefone,
			email: dadosValidados.email,
			endereco: dadosValidados.endereco,
			atualizadoem: new Date().toISOString(),
			criadoem: new Date().toISOString(),
		};

		const empresa = await criarEmpresaService({
			dadosEmpresa,
			proprietario: usuario.body,
			quantidadeEmpresas: empresasDoUsuario.body?.data?.length ?? 9999,
		});

		if (!empresa.success || !empresa.body) {
			return reply.status(empresa.status).send({
				error: empresa.error,
				code: empresa.code,
			});
		}

		return reply.status(empresa.status).send(empresa.body);
	} catch (error) {
		console.error(error);
		return reply.status(500).send({
			error: "Erro ao criar empresa",
			code: "CREATE_EMPRESA_ERROR",
		});
	}
}

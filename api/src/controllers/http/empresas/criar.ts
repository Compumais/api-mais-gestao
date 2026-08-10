import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarEmpresaService } from "../../../service/empresa/criar-empresa.js";
import { listarEmpresasService } from "../../../service/empresa/listar-empresas.js";
import { buscarUsuarioPorIdService } from "../../../service/usuarios/buscar.js";

const criarEmpresaSchema = z.object({
	nome: z.string().min(1),
	cnpj: z.string().min(1),
	email: z.string().min(1),
	telefone: z.string().min(1),
	endereco: z.string().min(1),
	numero: z.string().min(1),
	complemento: z.string().optional().default(""),
	bairro: z.string().min(1),
	cep: z.string().min(1),
	idestado: z.string().min(1),
	idcidade: z.string().min(1),
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
			numero: dadosValidados.numero,
			complemento: dadosValidados.complemento,
			bairro: dadosValidados.bairro,
			cep: dadosValidados.cep,
			idestado: dadosValidados.idestado,
			idcidade: dadosValidados.idcidade,
			atualizadoem: new Date().toISOString(),
			criadoem: new Date().toISOString(),
		};

		const empresa = await criarEmpresaService({
			dadosEmpresa,
			proprietario: usuario.body,
			quantidadeEmpresas: empresasDoUsuario.body?.data?.length ?? 9999,
		});

		if (!empresa.success) {
			return reply.status(empresa.status).send({
				error: empresa.error,
				code: empresa.code,
			});
		}

		if (!empresa.body) {
			return reply.status(500).send({
				error: "Erro ao criar empresa",
				code: "CREATE_EMPRESA_ERROR",
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

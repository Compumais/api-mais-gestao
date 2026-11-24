import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { criarLocacaoService } from "@/service/locacao/criar-locacao.js";
import { exigirUsuario, responderErro } from "./responder.js";

const itemSchema = z.object({
	idequipamento: z.string().min(1),
	periodo: z.enum(["diaria", "semanal", "quinzenal", "mensal"]),
	quantidade: z.coerce.number().int().min(1),
});

const bodySchema = z.object({
	idempresa: z.string().min(1),
	identidade: z.string().min(1),
	codigo: z.string().max(40).optional().nullable(),
	datainicio: z.string().min(1),
	cep: z.string().max(9).optional().nullable(),
	endereco: z.string().max(120).optional().nullable(),
	numeroendereco: z.string().max(20).optional().nullable(),
	complemento: z.string().max(60).optional().nullable(),
	bairro: z.string().max(60).optional().nullable(),
	idcidade: z.string().optional().nullable(),
	idestado: z.string().optional().nullable(),
	latitude: z.union([z.number(), z.string(), z.null()]).optional(),
	longitude: z.union([z.number(), z.string(), z.null()]).optional(),
	observacao: z.string().optional().nullable(),
	itens: z.array(itemSchema).min(1),
});

export async function criarLocacao(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const usuario = exigirUsuario(request, reply);
		if (!usuario) return;
		const dados = bodySchema.parse(request.body);
		const resultado = await criarLocacaoService({
			...dados,
			idusuario: usuario.id,
		});
		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}
		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		return responderErro(error, reply);
	}
}

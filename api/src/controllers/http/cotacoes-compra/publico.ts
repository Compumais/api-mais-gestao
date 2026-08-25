import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarCotacaoCompraPublicaService } from "@/service/cotacoes-compra/buscar-cotacao-compra-publica.js";
import { enviarPropostaCotacaoCompraService } from "@/service/cotacoes-compra/enviar-proposta-cotacao-compra.js";

const tokenParams = z.object({ token: z.string().min(8) });
const propostaBody = z.object({
	nome: z.string().min(2).max(120),
	telefone: z.string().min(8).max(20),
	itens: z
		.array(
			z.object({
				idcotacaoitem: z.string().uuid(),
				precounitario: z.coerce.number().positive(),
			}),
		)
		.min(1),
});

export async function buscarCotacaoCompraPublica(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const { token } = tokenParams.parse(request.params);
		const resultado = await buscarCotacaoCompraPublicaService(token);

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		console.error(error);
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}
		return reply.status(500).send({
			error: "Erro ao buscar cotação pública",
			code: "GET_COTACAO_PUBLICA_ERROR",
		});
	}
}

export async function enviarPropostaCotacaoCompra(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		const { token } = tokenParams.parse(request.params);
		const body = propostaBody.parse(request.body);
		const resultado = await enviarPropostaCotacaoCompraService({
			token,
			nome: body.nome,
			telefone: body.telefone,
			itens: body.itens,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		console.error(error);
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}
		return reply.status(500).send({
			error: "Erro ao enviar proposta",
			code: "ENVIAR_PROPOSTA_ERROR",
		});
	}
}

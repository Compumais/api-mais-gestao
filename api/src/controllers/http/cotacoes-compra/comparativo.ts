import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { comparativoCotacaoCompraService } from "@/service/cotacoes-compra/comparativo-cotacao-compra.js";
import { gerarPedidosCotacaoCompraService } from "@/service/cotacoes-compra/gerar-pedidos-cotacao-compra.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const paramsSchema = z.object({ id: z.string().uuid() });
const gerarBodySchema = z.object({
	itens: z
		.array(
			z.object({
				idcotacaoitem: z.string().uuid(),
				idproposta: z.string().uuid(),
			}),
		)
		.min(1),
});

export async function comparativoCotacaoCompra(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const resultado = await comparativoCotacaoCompraService({
			id,
			idusuario: request.user.id,
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
			error: "Erro ao buscar comparativo da cotação",
			code: "COMPARATIVO_COTACAO_ERROR",
		});
	}
}

export async function gerarPedidosCotacaoCompra(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const { id } = paramsSchema.parse(request.params);
		const body = gerarBodySchema.parse(request.body);
		const resultado = await gerarPedidosCotacaoCompraService({
			id,
			idusuario: request.user.id,
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
			error: "Erro ao gerar pedidos de compra",
			code: "GERAR_PEDIDOS_COMPRA_ERROR",
		});
	}
}

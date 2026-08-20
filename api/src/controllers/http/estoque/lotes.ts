import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { criarLoteAjusteService } from "@/service/lote/criar-lote-ajuste.js";
import { listarLotesProdutoService } from "@/service/lote/listar-lotes-produto.js";
import { sugerirLotesFefoService } from "@/service/lote/sugerir-lotes-fefo.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import type { TipoEstoque } from "@/util/tipo-estoque.js";

const queryListarLotesSchema = z.object({
	idempresa: z.string().uuid(),
	idproduto: z.string().uuid().optional(),
	codigoproduto: z.string().optional(),
});

const bodyCriarLoteSchema = z.object({
	idempresa: z.string().uuid(),
	idproduto: z.string().uuid(),
	numero: z.string().min(1).max(20),
	datafabricacao: z.string().optional().nullable(),
	datavalidade: z.string().optional().nullable(),
	codigoagregacao: z.string().max(20).optional().nullable(),
	quantidadeAjuste: z.number().positive().optional(),
	tipoestoque: z.coerce.number().int().min(0).max(2).optional(),
});

const bodySugerirFefoSchema = z.object({
	idempresa: z.string().uuid(),
	idproduto: z.string().uuid(),
	quantidade: z.number().positive(),
	idcfop: z.string().uuid().optional().nullable(),
	dataReferencia: z.string().optional(),
	tipoSaldo: z.enum(["operacional", "fiscal", "ambos"]).optional(),
});

export async function listarLotes(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const query = queryListarLotesSchema.parse(request.query);
		const resultado = await listarLotesProdutoService({
			idusuario: request.user.id,
			idempresa: query.idempresa,
			idproduto: query.idproduto,
			codigoproduto: query.codigoproduto,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

export async function criarLote(request: FastifyRequest, reply: FastifyReply) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = bodyCriarLoteSchema.parse(request.body);
		const resultado = await criarLoteAjusteService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			idproduto: body.idproduto,
			numero: body.numero,
			datafabricacao: body.datafabricacao,
			datavalidade: body.datavalidade,
			codigoagregacao: body.codigoagregacao,
			quantidadeAjuste: body.quantidadeAjuste,
			tipoestoque: body.tipoestoque as TipoEstoque | undefined,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

export async function sugerirLotesFefo(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = bodySugerirFefoSchema.parse(request.body);
		const resultado = await sugerirLotesFefoService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			idproduto: body.idproduto,
			quantidade: body.quantidade,
			idcfop: body.idcfop,
			dataReferencia: body.dataReferencia,
			tipoSaldo: body.tipoSaldo,
		});

		if (!resultado.success) {
			return reply.status(resultado.status).send(resultado);
		}

		return reply.status(resultado.status).send(resultado.body);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return reply.status(400).send({
				error: "Erro de validação",
				code: "VALIDATION_ERROR",
				details: error.issues,
			});
		}
		return reply.status(httpErroInterno().status).send(httpErroInterno());
	}
}

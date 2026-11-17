import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarContaCorrenteService } from "@/service/contacorrente/atualizar-conta-corrente.js";
import { httpNaoAutorizado } from "@/util/http-util.js";

const atualizarContaCorrenteParamsSchema = z.object({
	id: z.string().uuid(),
});

const atualizarContaCorrenteBodySchema = z.object({
	descricao: z.string().max(50).optional().nullable(),
	agencia: z.string().max(25).optional().nullable(),
	numeroconta: z.string().max(40).optional().nullable(),
	abertura: z.coerce.date().optional().nullable(),
	observacao: z.string().max(150).optional().nullable(),
	nometitular: z.string().max(20).optional().nullable(),
	cnpjcpftitular: z.string().max(20).optional().nullable(),
	gerente: z.string().max(40).optional().nullable(),
	telefonegerente: z.string().max(20).optional().nullable(),
	codigo: z.number().int().positive().optional().nullable(),
	idbanco: z.string().uuid().optional().nullable(),
	carteira: z.string().max(6).optional().nullable(),
	codigocedente: z.string().max(20).optional().nullable(),
	codigocedentedv: z.string().max(1).optional().nullable(),
	agenciadv: z.string().max(1).optional().nullable(),
	contadv: z.string().max(2).optional().nullable(),
	layoutarquivoremessa: z.enum(["cnab240", "cnab400"]).optional().nullable(),
	layoutarquivoretorno: z.enum(["cnab240", "cnab400"]).optional().nullable(),
	localpagamentoboleto: z.string().max(200).optional().nullable(),
	nossonumeroseq: z.coerce.number().int().nonnegative().optional().nullable(),
	sequenciaremessa: z.coerce.number().int().nonnegative().optional().nullable(),
});

export async function atualizarContaCorrente(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const idusuario = request.user.id;
		const { id } = atualizarContaCorrenteParamsSchema.parse(request.params);
		const dados = atualizarContaCorrenteBodySchema.parse(request.body);

		const dadosAtualizacao = {
			descricao: dados.descricao,
			agencia: dados.agencia,
			numeroconta: dados.numeroconta,
			abertura: dados.abertura
				? dados.abertura.toISOString().split("T")[0]
				: dados.abertura,
			observacao: dados.observacao,
			nometitular: dados.nometitular,
			cnpjcpftitular: dados.cnpjcpftitular,
			gerente: dados.gerente,
			telefonegerente: dados.telefonegerente,
			codigo: dados.codigo,
			// Garantir que idbanco seja null quando undefined para permitir limpar o banco
			idbanco: dados.idbanco ?? null,
			carteira: dados.carteira,
			codigocedente: dados.codigocedente,
			codigocedentedv: dados.codigocedentedv,
			agenciadv: dados.agenciadv,
			contadv: dados.contadv,
			layoutarquivoremessa: dados.layoutarquivoremessa,
			layoutarquivoretorno: dados.layoutarquivoretorno,
			localpagamentoboleto: dados.localpagamentoboleto,
			nossonumeroseq: dados.nossonumeroseq,
			sequenciaremessa: dados.sequenciaremessa,
		};

		const resultado = await atualizarContaCorrenteService({
			contaCorrenteId: id,
			idusuario,
			dados: dadosAtualizacao,
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
			error: "Erro ao atualizar conta corrente",
			code: "UPDATE_CONTA_CORRENTE_ERROR",
		});
	}
}

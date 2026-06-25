import type { FastifyReply, FastifyRequest } from "fastify";

import z from "zod";

import {

	atualizarNfceConfiguracaoService,

	buscarNfceConfiguracaoService,

} from "@/service/nfce-configuracao/buscar-nfce-configuracao.js";

import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";



const paramsSchema = z.object({ id: z.string().uuid() });



const bodySchema = z.object({

	ambiente: z.number().int().min(1).max(2).optional(),

	idcertificadoativo: z.string().uuid().nullable().optional(),

	idcsc_homologacao: z.string().max(6).nullable().optional(),

	csctoken_homologacao: z.string().max(36).nullable().optional(),

	idcsc_producao: z.string().max(6).nullable().optional(),

	csctoken_producao: z.string().max(36).nullable().optional(),

	contingenciaativa: z.boolean().optional(),

	contingenciajson: z.record(z.string(), z.unknown()).nullable().optional(),

	meiospagamentonfce: z
		.object({
			dinheiro: z.boolean(),
			cartao: z.boolean(),
			pix: z.boolean(),
			prepago: z.boolean(),
		})
		.optional(),

});



export async function buscarNfceConfiguracao(

	request: FastifyRequest,

	reply: FastifyReply,

) {

	try {

		if (!request.user) {

			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());

		}



		const { id } = paramsSchema.parse(request.params);



		const resultado = await buscarNfceConfiguracaoService({

			idempresa: id,

			idusuario: request.user.id,

		});



		if (!resultado.success) {

			return reply.status(resultado.status).send(resultado);

		}



		return reply.status(resultado.status).send(resultado.body);

	} catch (error) {

		console.error(error);

		return reply.status(httpErroInterno().status).send(httpErroInterno());

	}

}



export async function atualizarNfceConfiguracao(

	request: FastifyRequest,

	reply: FastifyReply,

) {

	try {

		if (!request.user) {

			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());

		}



		const { id } = paramsSchema.parse(request.params);

		const dados = bodySchema.parse(request.body);



		const resultado = await atualizarNfceConfiguracaoService({

			idempresa: id,

			idusuario: request.user.id,

			dados: dados as Parameters<typeof atualizarNfceConfiguracaoService>[0]["dados"],

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

		return reply.status(httpErroInterno().status).send(httpErroInterno());

	}

}


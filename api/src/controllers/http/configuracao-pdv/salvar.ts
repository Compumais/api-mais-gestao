import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { salvarConfiguracaoPdvService } from "@/service/configuracao-pdv/salvar-configuracao-pdv.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const bodySchema = z.object({
	idempresa: z.string().uuid(),
	modeloAtendimento: z.enum(["mesa", "comanda"]).optional(),
	etiqueta_balanca_habilitada: z.enum(["0", "1"]).optional(),
	etiqueta_balanca_prefixo: z.string().optional(),
	etiqueta_balanca_digitos_codigo: z.enum(["4", "5", "6"]).optional(),
	etiqueta_balanca_conteudo: z.enum(["preco", "peso"]).optional(),
	etiqueta_balanca_centavos: z.enum(["0", "1"]).optional(),
	etiqueta_balanca_indicador_uso: z.enum(["0", "1"]).optional(),
});

export async function salvarConfiguracaoPdv(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	try {
		if (!request.user) {
			return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
		}

		const body = bodySchema.parse(request.body);
		const resultado = await salvarConfiguracaoPdvService({
			idusuario: request.user.id,
			idempresa: body.idempresa,
			dados: {
				modeloAtendimento: body.modeloAtendimento ?? "mesa",
				etiqueta_balanca_habilitada: body.etiqueta_balanca_habilitada ?? "0",
				etiqueta_balanca_prefixo: body.etiqueta_balanca_prefixo ?? "2",
				etiqueta_balanca_digitos_codigo:
					body.etiqueta_balanca_digitos_codigo ?? "4",
				etiqueta_balanca_conteudo: body.etiqueta_balanca_conteudo ?? "preco",
				etiqueta_balanca_centavos: body.etiqueta_balanca_centavos ?? "1",
				etiqueta_balanca_indicador_uso:
					body.etiqueta_balanca_indicador_uso ?? "0",
			},
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

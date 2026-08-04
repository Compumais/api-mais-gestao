import z from "zod";
import type { FastifyReply, FastifyRequest } from "fastify";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { criarNfseSerieService } from "@/service/nfse-serie/nfse-serie.js";

const criarBodySchema = z.object({
    idempresa: z.string().uuid(),
    serie: z.string().min(1).max(5),
    numeroproximo: z.number().int().min(1).optional(),
    padrao: z.boolean().optional(),
    ativo: z.boolean().optional(),
});

export async function criarNfseSerie(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        if (!request.user) {
            return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
        }

        const dados = criarBodySchema.parse(request.body);

        const resultado = await criarNfseSerieService({
            idempresa: dados.idempresa,
            idusuario: request.user.id,
            dados: {
                serie: dados.serie,
                ...(dados.numeroproximo !== undefined
                    ? { numeroproximo: dados.numeroproximo }
                    : {}),
                ...(dados.padrao !== undefined ? { padrao: dados.padrao } : {}),
                ...(dados.ativo !== undefined ? { ativo: dados.ativo } : {}),
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

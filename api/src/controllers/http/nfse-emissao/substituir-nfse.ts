import z from "zod";
import type { FastifyReply, FastifyRequest } from "fastify";
import { httpErroInterno, httpNaoAutorizado } from "src/util/http-util";
import { substituirNfseService } from "src/service/nfse-emissao/substituir-nfse";


export async function substituirNfse(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        if (!request.user) {
            return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
        }

        const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
        const body = z
            .object({
                idnotafiscalsubstituta: z.string().uuid(),
                motivo: z.string().min(15).max(255),
            })
            .parse(request.body);

        const resultado = await substituirNfseService({
            idusuario: request.user.id,
            idnotafiscal: id,
            idnotafiscalsubstituta: body.idnotafiscalsubstituta,
            motivo: body.motivo,
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
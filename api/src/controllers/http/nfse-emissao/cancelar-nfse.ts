import type { FastifyReply, FastifyRequest } from "fastify";
import { cancelarNfseService } from "@/service/nfse-emissao/cancelar-nfse.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import z from "zod";

export async function cancelarNfse(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        if (!request.user) {
            return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
        }

        const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
        const { motivo } = z
            .object({ motivo: z.string().min(15).max(255) })
            .parse(request.body);

        const resultado = await cancelarNfseService({
            idusuario: request.user.id,
            idnotafiscal: id,
            motivo,
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
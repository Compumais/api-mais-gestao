import z from "zod";
import type { FastifyReply, FastifyRequest } from "fastify";
import { buscarNotaFiscalService } from "@/service/nota-fiscal/buscar-nota-fiscal.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

export async function buscarNfsePorId(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        if (!request.user) {
            return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
        }

        const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

        const resultado = await buscarNotaFiscalService({
            idusuario: request.user.id,
            notaFiscalId: id,
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

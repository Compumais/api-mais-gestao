import z from "zod";
import type { FastifyReply, FastifyRequest } from "fastify";
import { httpErroInterno, httpNaoAutorizado } from "src/util/http-util";
import { listarNfeSeriesService } from "src/service/nfe-serie/nfe-serie";

const queryEmpresaSchema = z.object({
    idempresa: z.string().uuid(),
    modelo: z.string().max(2).optional(),
});

export async function listarNfeSeries(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        if (!request.user) {
            return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
        }

        const { idempresa, modelo } = queryEmpresaSchema.parse(request.query);

        const resultado = await listarNfeSeriesService({
            idempresa,
            idusuario: request.user.id,
            ...(modelo ? { modelo } : {}),
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

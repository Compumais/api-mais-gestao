import z from "zod";
import type { FastifyReply, FastifyRequest } from "fastify";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";
import { consultarNfseService } from "@/service/nfse-emissao/consultar-nfse.js";

export async function consultarNfse(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        if (!request.user) {
            return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
        }

        const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

        const resultado = await consultarNfseService({
            idusuario: request.user.id,
            idnotafiscal: id,
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
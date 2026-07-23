import z from "zod";
import type { FastifyReply, FastifyRequest } from "fastify";
import { TIPO_ORIGEM_NFSE } from "@/constants/nfse-emissao.js";
import { listarNotasFiscaisService } from "@/service/nota-fiscal/listar-notas-fiscais.js";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util.js";

const listarNfseQuerySchema = z.object({
    idempresa: z.string().uuid(),
    status: z.coerce.number().optional(),
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(20),
});


export async function listarNfsesEmitidas(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        if (!request.user) {
            return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
        }

        const { idempresa, status, page, limit } = listarNfseQuerySchema.parse(
            request.query,
        );

        const resultado = await listarNotasFiscaisService({
            idusuario: request.user.id,
            idempresa,
            status,
            tipoorigem: TIPO_ORIGEM_NFSE,
            page,
            limit,
            rascunho: false,
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

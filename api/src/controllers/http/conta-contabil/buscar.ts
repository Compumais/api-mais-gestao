import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { buscarContaContabilService } from "@/service/contacontabil/buscar-conta-contabil";
import { httpNaoAutorizado } from "@/util/http-util";

const buscarContaContabilParamsSchema = z.object({
    id: z.string(),
});

export async function buscarContaContabil(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        if (!request.user) {
            return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
        }

        const { id } = buscarContaContabilParamsSchema.parse(request.params);

        const contaContabil = await buscarContaContabilService({ id });

        if (!contaContabil.success) {
            return reply.status(contaContabil.status).send(contaContabil);
        }

        return reply.status(contaContabil.status).send(contaContabil.body);
    } catch (err) {
        console.error(err);
        if (err instanceof z.ZodError) {
            return reply.status(400).send({
                error: "Erro de validação",
                code: "VALIDATION_ERROR",
                details: err.issues,
            });
        }
        return reply.status(500).send({
            error: "Erro ao buscar conta contábil",
            code: "GET_CONTA_CONTABIL_ERROR",
        });
    }
}

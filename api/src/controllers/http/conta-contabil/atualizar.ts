import type { FastifyReply, FastifyRequest } from "fastify";
import z from "zod";
import { atualizarContaContabilService } from "@/service/contacontabil/atualizar-conta-contabil";
import { httpNaoAutorizado } from "@/util/http-util";

const atualizarContaContabilParamsSchema = z.object({
    id: z.string(),
});

const atualizarContaContabilBodySchema = z.object({
    descricao: z.string().max(100),
    natureza: z.string().max(1).optional(),
    tipocontacontabil: z.string().max(1).optional(),
    codigoreduzido: z.string().max(20).optional(),
    codigocontareferencial: z.string().max(60).optional(),
    codigoextenso: z.string().max(85).optional(),
    contaglutinadora: z.number().int().optional(),
    nivelconta: z.number().int().optional(),
    idcontapai: z.string().optional(),
    inativo: z.number().int().min(0).max(1).optional(),
    numeronivel1: z.string().max(20).optional(),
    numeronivel2: z.string().max(20).optional(),
    numeronivel3: z.string().max(20).optional(),
    numeronivel4: z.string().max(20).optional(),
    numeronivel5: z.string().max(20).optional(),
    numeronivel6: z.string().max(20).optional(),
    numeronivel7: z.string().max(20).optional(),
    numeronivel8: z.string().max(20).optional(),
    numeronivel9: z.string().max(20).optional(),
});

export async function atualizarContaContabil(
    request: FastifyRequest,
    reply: FastifyReply,
) {
    try {
        if (!request.user) {
            return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
        }

        const idusuario = request.user.id;
        const { id } = atualizarContaContabilParamsSchema.parse(request.params);
        const dados = atualizarContaContabilBodySchema.parse(request.body);

        const resultado = await atualizarContaContabilService({
            id,
            idusuario,
            dados,
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
        return reply.status(500).send({
            error: "Erro ao atualizar conta contábil",
            code: "UPDATE_CONTA_CONTABIL_ERROR",
        });
    }
}

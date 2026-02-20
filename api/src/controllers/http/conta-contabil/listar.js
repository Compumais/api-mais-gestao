import z from "zod";
import { listarContasContabeisService } from "@/service/contacontabil/listar-contas-contabeis";
import { httpNaoAutorizado } from "@/util/http-util";
const listarContasContabeisQuerySchema = z.object({
    idempresa: z.string(),
    descricao: z.string().optional(),
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(10),
});
export async function listarContasContabeis(request, reply) {
    try {
        if (!request.user) {
            return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
        }
        const query = listarContasContabeisQuerySchema.parse(request.query);
        const resultado = await listarContasContabeisService({
            idusuario: request.user.id,
            idempresa: query.idempresa,
            descricao: query.descricao,
            page: query.page,
            limit: query.limit,
        });
        if (!resultado.success) {
            return reply.status(resultado.status).send(resultado);
        }
        return reply.status(resultado.status).send(resultado.body);
    }
    catch (error) {
        console.error(error);
        if (error instanceof z.ZodError) {
            return reply.status(400).send({
                error: "Erro de validação",
                code: "VALIDATION_ERROR",
                details: error.issues,
            });
        }
        return reply.status(500).send({
            error: "Erro ao listar contas contábeis",
            code: "LIST_CONTA_CONTABIL_ERROR",
        });
    }
}
//# sourceMappingURL=listar.js.map
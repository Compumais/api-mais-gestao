import z from "zod";
import { listarContaCorrenteLancamentosService } from "@/service/contacorrentelancamento/listar-conta-corrente-lancamentos";
import { httpNaoAutorizado } from "@/util/http-util";
const listarContaCorrenteLancamentoQuerySchema = z.object({
    idcontacorrente: z.string(),
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(10),
});
export async function listarContaCorrenteLancamento(request, reply) {
    try {
        if (!request.user) {
            return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
        }
        const query = listarContaCorrenteLancamentoQuerySchema.parse(request.query);
        const resultado = await listarContaCorrenteLancamentosService({
            idcontacorrente: query.idcontacorrente,
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
            error: "Erro ao listar lançamentos de conta corrente",
            code: "LIST_CONTA_CORRENTE_LANCAMENTO_ERROR",
        });
    }
}
//# sourceMappingURL=listar.js.map
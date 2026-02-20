import z from "zod";
import { listarFinanceiroLancamentoService } from "@/service/financeirolancamento/listar-financeiro-lancamentos";
import { httpNaoAutorizado } from "@/util/http-util";
const listarFinanceiroLancamentoQuerySchema = z.object({
    idfinanceiro: z.string(),
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(10),
});
export async function listarFinanceiroLancamento(request, reply) {
    try {
        if (!request.user) {
            return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
        }
        const query = listarFinanceiroLancamentoQuerySchema.parse(request.query);
        const resultado = await listarFinanceiroLancamentoService({
            idfinanceiro: query.idfinanceiro,
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
            error: "Erro ao listar lançamentos financeiros",
            code: "LIST_FINANCEIRO_LANCAMENTO_ERROR",
        });
    }
}
//# sourceMappingURL=listar.js.map
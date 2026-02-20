import z from "zod";
import { buscarFinanceiroService } from "@/service/financeiro/buscar-financeiro";
const buscarFinanceiroParamsSchema = z.object({
    id: z.string().uuid(),
});
export async function buscarFinanceiro(request, reply) {
    try {
        const { id } = buscarFinanceiroParamsSchema.parse(request.params);
        const resultado = await buscarFinanceiroService(id);
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
            error: "Erro ao buscar financeiro",
            code: "GET_FINANCEIRO_ERROR",
        });
    }
}
//# sourceMappingURL=buscar.js.map
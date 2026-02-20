import z from "zod";
import { excluirPlanoContasService } from "../../../service/planocontas/excluir-plano-contas";
const excluirPlanoContasParamsSchema = z.object({
    id: z.string().uuid(),
});
export async function excluirPlanoContas(request, reply) {
    try {
        if (!request.user) {
            return reply.status(401).send({
                error: "Não autorizado",
                code: "UNAUTHORIZED",
            });
        }
        const idusuario = request.user.id;
        const { id } = excluirPlanoContasParamsSchema.parse(request.params);
        const resultado = await excluirPlanoContasService({
            idplanocontas: id,
            idusuario,
            roles: request.user.roles,
        });
        if (!resultado.success) {
            return reply.status(resultado.status).send(resultado);
        }
        return reply.status(resultado.status).send();
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
            error: "Erro ao excluir plano de contas",
            code: "DELETE_PLANO_CONTAS_ERROR",
        });
    }
}
//# sourceMappingURL=excluir.js.map
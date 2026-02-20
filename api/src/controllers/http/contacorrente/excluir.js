import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria";
import { excluirContaCorrenteService } from "@/service/contacorrente/excluir";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util";
const excluirContaCorrenteParamsSchema = z.object({
    id: z.string().uuid(),
});
export async function excluirContaCorrente(request, reply) {
    try {
        if (!request.user) {
            return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
        }
        const idusuario = request.user.id;
        const { id } = excluirContaCorrenteParamsSchema.parse(request.params);
        const auditoriaId = uuidv4();
        const auditoria = await criarAuditoriaService({
            id: auditoriaId,
            idusuario: request.user.id,
            acao: "excluir_conta_corrente",
            recursoId: id,
            recurso: "conta_corrente",
            criadoem: new Date().toISOString(),
            metadados: {
                usuario: request.user.name,
                contaCorrenteId: id,
            },
        });
        if (!auditoria) {
            return reply
                .status(httpErroInterno().status)
                .send(httpErroInterno().error);
        }
        const resultado = await excluirContaCorrenteService({
            id,
            idusuario,
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
                details: error.message,
            });
        }
        return reply.status(500).send({
            error: "Erro ao excluir conta corrente",
            code: "DELETE_CONTA_CORRENTE_ERROR",
        });
    }
}
//# sourceMappingURL=excluir.js.map
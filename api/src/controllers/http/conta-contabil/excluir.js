import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria";
import { excluirContaContabilService } from "@/service/contacontabil/excluir-conta-contabil";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util";
const excluirContaContabilParamsSchema = z.object({
    id: z.string(),
});
export async function excluirContaContabil(request, reply) {
    try {
        if (!request.user) {
            return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
        }
        const idusuario = request.user.id;
        const { id } = excluirContaContabilParamsSchema.parse(request.params);
        const auditoriaId = uuidv4();
        const auditoria = await criarAuditoriaService({
            id: auditoriaId,
            idusuario: request.user.id,
            acao: "excluir_conta_contabil",
            recurso: "conta_contabil",
            criadoem: new Date().toISOString(),
            metadados: {
                usuario: request.user.name,
                contaContabilId: id,
            },
        });
        if (!auditoria) {
            return reply
                .status(httpErroInterno().status)
                .send(httpErroInterno().error);
        }
        const resultado = await excluirContaContabilService({
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
            error: "Erro ao excluir conta contábil",
            code: "DELETE_CONTA_CONTABIL_ERROR",
        });
    }
}
//# sourceMappingURL=excluir.js.map
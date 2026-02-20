import { v4 as uuidv4 } from "uuid";
import z from "zod";
import { criarAuditoriaService } from "@/service/auditoria/criar-auditoria";
import { criarContaContabilService } from "@/service/contacontabil/criar-conta-contabil";
import { excluirContaContabilService } from "@/service/contacontabil/excluir-conta-contabil";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util";
const criarContaContabilBodySchema = z.object({
    idempresa: z.string(),
    descricao: z.string().max(100),
    natureza: z.string().max(1).optional(),
    tipocontacontabil: z.string().max(1).optional(),
    codigoreduzido: z.string().max(20).optional(),
    codigocontareferencial: z.string().max(60).optional(),
    codigoextenso: z.string().max(85).optional(),
    contaglutinadora: z.number().int().optional(),
    nivelconta: z.number().int().optional(),
    idcontapai: z.string().optional(),
    numeronivel1: z.string().max(20).optional(),
    numeronivel2: z.string().max(20).optional(),
    numeronivel3: z.string().max(20).optional(),
    numeronivel4: z.string().max(20).optional(),
    numeronivel5: z.string().max(20).optional(),
    numeronivel6: z.string().max(20).optional(),
    numeronivel7: z.string().max(20).optional(),
    numeronivel8: z.string().max(20).optional(),
    numeronivel9: z.string().max(20).optional(),
    inativo: z.number().int().min(0).max(1).optional(),
});
export async function criarContaContabil(request, reply) {
    try {
        if (!request.user) {
            return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
        }
        const dadosValidados = criarContaContabilBodySchema.parse(request.body);
        const dadosContaContabil = {
            id: uuidv4(),
            ...dadosValidados,
        };
        const contaContabil = await criarContaContabilService({
            idusuario: request.user.id,
            dadosContaContabil,
        });
        if (!contaContabil.success) {
            return reply.status(contaContabil.status).send(contaContabil);
        }
        const auditoriaId = uuidv4();
        await criarAuditoriaService({
            id: auditoriaId,
            idusuario: request.user.id,
            acao: "criar_conta_contabil",
            recurso: "conta_contabil",
            criadoem: new Date().toISOString(),
            metadados: {
                idcontacontabil: contaContabil.body?.id ?? "",
                descricao: contaContabil.body?.descricao ?? "",
            },
        });
        return reply.status(contaContabil.status).send(contaContabil.body);
    }
    catch (err) {
        console.error(err);
        if (err instanceof z.ZodError) {
            return reply.status(400).send({
                error: "Erro de validação",
                code: "VALIDATION_ERROR",
                details: err.issues,
            });
        }
        return reply.status(httpErroInterno().status).send(httpErroInterno());
    }
}
//# sourceMappingURL=criar.js.map
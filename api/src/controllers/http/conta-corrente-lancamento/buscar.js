import z from "zod";
import { buscarContaCorrenteLancamentoPorIdService } from "@/service/contacorrentelancamento/buscar-por-id";
import { httpErroInterno, httpNaoAutorizado } from "@/util/http-util";
const buscarContaCorrenteLancamentoParamsSchema = z.object({
    id: z.string(),
});
export async function buscarContaCorrenteLancamento(request, reply) {
    try {
        if (!request.user) {
            return reply
                .status(httpNaoAutorizado().status)
                .send(httpNaoAutorizado().error);
        }
        const { id } = buscarContaCorrenteLancamentoParamsSchema.parse(request.params);
        const resultado = await buscarContaCorrenteLancamentoPorIdService(id);
        if (!resultado.success) {
            return reply.status(resultado.status).send(resultado.error);
        }
        return reply.status(resultado.status).send(resultado.body);
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
        return reply.status(httpErroInterno().status).send(httpErroInterno().error);
    }
}
//# sourceMappingURL=buscar.js.map
import z from "zod";
import { buscarBancoPorIdService } from "@/service/bancos/buscar-por-id";
import { httpNaoAutorizado } from "@/util/http-util";
const buscarBancoParamsSchema = z.object({
    id: z.string(),
});
export async function buscarBanco(request, reply) {
    try {
        if (!request.user) {
            return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
        }
        const { id } = buscarBancoParamsSchema.parse(request.params);
        const banco = await buscarBancoPorIdService({
            id,
            idusuario: request.user.id,
        });
        if (!banco.success) {
            return reply.status(banco.status).send(banco);
        }
        return reply.status(banco.status).send(banco.body);
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
        return reply.status(500).send({
            error: "Erro ao buscar banco",
            code: "GET_BANCO_ERROR",
        });
    }
}
//# sourceMappingURL=buscar.js.map
import z from "zod";
import { criarWebhookService } from "@/service/configuracao/criar-webhook";
import { httpNaoAutorizado } from "@/util/http-util";
const criarWebhookParamsSchema = z.object({
    idempresa: z.string(),
});
const criarWebhookBodySchema = z.object({
    url: z.string().url("URL inválida"),
    eventos: z.array(z.string()).min(1, "Pelo menos um evento é obrigatório"),
});
export async function criarWebhook(request, reply) {
    try {
        if (!request.user) {
            return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
        }
        const params = criarWebhookParamsSchema.parse(request.params);
        const body = criarWebhookBodySchema.parse(request.body);
        const resultado = await criarWebhookService({
            idempresa: params.idempresa,
            idusuario: request.user.id,
            url: body.url,
            eventos: body.eventos,
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
            error: "Erro ao criar webhook",
            code: "CREATE_WEBHOOK_ERROR",
        });
    }
}
//# sourceMappingURL=criar-webhook.js.map
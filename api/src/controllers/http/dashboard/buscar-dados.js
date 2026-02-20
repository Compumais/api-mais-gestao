import z from "zod";
import { buscarDadosDashboardService } from "@/service/dashboard/buscar-dados-dashboard";
import { httpNaoAutorizado } from "@/util/http-util";
const buscarDadosDashboardQuerySchema = z.object({
    idempresa: z.string().uuid().optional(),
});
export async function buscarDadosDashboard(request, reply) {
    try {
        if (!request.user) {
            return reply.status(httpNaoAutorizado().status).send(httpNaoAutorizado());
        }
        const query = buscarDadosDashboardQuerySchema.parse(request.query);
        const resultado = await buscarDadosDashboardService({
            idusuario: request.user.id,
            idempresa: query.idempresa,
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
            error: "Erro ao buscar dados do dashboard",
            code: "DASHBOARD_ERROR",
        });
    }
}
//# sourceMappingURL=buscar-dados.js.map
import z from "zod";
import { listarEntidadesService } from "@/service/entidades/listar-entidades";
const listarEntidadesQuerySchema = z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(10),
    nome: z.string().optional(),
    email: z.string().optional(),
    telefone: z.string().optional(),
    idempresa: z.uuid(),
});
export async function listarEntidades(request, reply) {
    try {
        if (!request.user) {
            return reply.status(401).send({
                error: "Não autorizado",
                code: "UNAUTHORIZED",
            });
        }
        const idusuario = request.user.id;
        const query = listarEntidadesQuerySchema.parse(request.query);
        const resultado = await listarEntidadesService({
            idusuario,
            ...query,
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
            error: "Erro ao listar entidades",
            code: "LIST_ENTIDADE_ERROR",
        });
    }
}
//# sourceMappingURL=listar-entidades.js.map
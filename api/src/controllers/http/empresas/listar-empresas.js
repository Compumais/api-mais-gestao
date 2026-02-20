import z from "zod";
import { listarEmpresasService } from "../../../service/empresa/listar-empresas";
const listarEmpresasQuerySchema = z.object({
    page: z.coerce.number().min(1).optional().default(1),
    limit: z.coerce.number().min(1).max(100).optional().default(10),
    idproprietario: z.string().optional(),
    idusuario: z.string().optional(),
    nome: z.string().optional(),
    cnpj: z.string().optional(),
    telefone: z.string().optional(),
});
export async function listarEmpresas(request, reply) {
    try {
        const query = listarEmpresasQuerySchema.parse(request.query);
        const resultado = await listarEmpresasService(query);
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
            error: "Erro ao listar empresas",
            code: "LIST_EMPRESA_ERROR",
        });
    }
}
//# sourceMappingURL=listar-empresas.js.map
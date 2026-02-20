import { verifyJwt } from "../../middleware/verify-jwt.js";
import { listarAuditorias } from "./listar-auditorias.js";
export async function auditoriaRotas(app) {
    app.addHook("onRequest", verifyJwt);
    app.get("/auditoria", {
        handler: listarAuditorias,
        schema: {
            tags: ["auditoria"],
            summary: "Lista logs de auditoria",
            description: "Lista os logs de auditoria da empresa do usuário autenticado. Retorna uma lista paginada de registros de auditoria.",
            security: [{ bearerAuth: [] }],
            querystring: {
                type: "object",
                required: ["idempresa"],
                properties: {
                    idempresa: {
                        type: "string",
                        format: "uuid",
                        description: "ID da empresa",
                    },
                    page: {
                        type: "number",
                        minimum: 1,
                        default: 1,
                        description: "Número da página",
                    },
                    limit: {
                        type: "number",
                        minimum: 1,
                        maximum: 100,
                        default: 10,
                        description: "Quantidade de registros por página",
                    },
                },
            },
            response: {
                200: {
                    type: "object",
                    properties: {
                        data: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    acao: { type: "string" },
                                    recurso: { type: "string" },
                                    idrecurso: { type: "string", nullable: true },
                                    idusuario: { type: "string", nullable: true },
                                    idempresa: { type: "string", nullable: true },
                                    metadados: { type: "object", nullable: true },
                                    criadoem: { type: "string", format: "date-time" },
                                },
                            },
                        },
                        paginacao: {
                            type: "object",
                            properties: {
                                page: { type: "number" },
                                limit: { type: "number" },
                                total: { type: "number" },
                                totalPages: { type: "number" },
                            },
                        },
                    },
                },
            },
        },
    });
}
//# sourceMappingURL=rotas.js.map
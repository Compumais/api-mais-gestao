import type { FastifySchema } from "fastify";

export const criarContaContabilSchema: FastifySchema = {
    tags: ["conta-contabil"],
    summary: "Criar nova conta contábil",
    description:
        "Cria uma nova conta contábil na empresa do usuário autenticado.",
    security: [{ bearerAuth: [] }],
    body: {
        type: "object",
        properties: {
            idempresa: {
                type: "string",
                description: "ID da empresa proprietária",
            },
            descricao: {
                type: "string",
                maxLength: 100,
                description: "Descrição da conta contábil",
            },
            natureza: {
                type: "string",
                maxLength: 1,
                description: "Natureza da conta (D = Devedora, C = Credora)",
            },
            tipocontacontabil: {
                type: "string",
                maxLength: 1,
                description: "Tipo da conta contábil (S = Sintética, A = Analítica)",
            },
            codigoreduzido: {
                type: "string",
                maxLength: 20,
                description: "Código reduzido da conta",
            },
            codigocontareferencial: {
                type: "string",
                maxLength: 60,
                description: "Código de conta referencial",
            },
            codigoextenso: {
                type: "string",
                maxLength: 85,
                description: "Código por extenso",
            },
            contaglutinadora: {
                type: "number",
                description: "Indica se é conta aglutinadora",
            },
            nivelconta: {
                type: "number",
                description: "Nível hierárquico da conta",
            },
            idcontapai: {
                type: "string",
                description: "ID da conta pai (auto-referência)",
            },
            inativo: {
                type: "number",
                description: "Status: 0 = ativo, 1 = inativo",
            },
        },
        required: ["idempresa", "descricao"],
    },
    response: {
        201: {
            type: "object",
            description: "Conta contábil criada com sucesso",
            properties: {
                id: { type: "string" },
                idempresa: { type: "string" },
                descricao: { type: "string" },
                natureza: { type: "string" },
                tipocontacontabil: { type: "string" },
                codigoreduzido: { type: "string" },
                codigoextenso: { type: "string" },
                nivelconta: { type: "number" },
                currenttimemillis: { type: "number" },
            },
        },
        400: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
                details: { type: "array" },
            },
        },
        401: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
            },
        },
        403: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
            },
        },
        500: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
            },
        },
    },
};

export const buscarContaContabilSchema: FastifySchema = {
    tags: ["conta-contabil"],
    summary: "Buscar conta contábil por ID",
    description: "Retorna os dados completos de uma conta contábil específica",
    security: [{ bearerAuth: [] }],
    params: {
        type: "object",
        properties: {
            id: { type: "string", description: "ID único da conta contábil" },
        },
        required: ["id"],
    },
    response: {
        200: {
            type: "object",
            description: "Dados da conta contábil",
            properties: {
                id: { type: "string" },
                idempresa: { type: "string" },
                descricao: { type: "string" },
                natureza: { type: "string" },
                tipocontacontabil: { type: "string" },
                codigoreduzido: { type: "string" },
                codigoextenso: { type: "string" },
                codigocontareferencial: { type: "string" },
                nivelconta: { type: "number" },
                inativo: { type: "number" },
                currenttimemillis: { type: "number" },
                datacadastro: { type: "string" },
                dataultimaalteracao: { type: "string" },
            },
        },
        401: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
            },
        },
        404: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
            },
        },
        500: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
            },
        },
    },
};

export const listarContasContabeisSchema: FastifySchema = {
    tags: ["conta-contabil"],
    summary: "Listar contas contábeis",
    description:
        "Lista as contas contábeis de uma empresa com paginação e filtro por descrição.",
    security: [{ bearerAuth: [] }],
    querystring: {
        type: "object",
        properties: {
            idempresa: {
                type: "string",
                description: "ID da empresa para filtrar",
            },
            descricao: {
                type: "string",
                description: "Filtro opcional por descrição",
            },
            page: {
                type: "number",
                description: "Número da página (padrão: 1)",
                default: 1,
            },
            limit: {
                type: "number",
                description: "Quantidade de itens por página (padrão: 10)",
                default: 10,
            },
        },
        required: ["idempresa"],
    },
    response: {
        200: {
            type: "object",
            description: "Lista paginada de contas contábeis",
            properties: {
                data: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            idempresa: { type: "string" },
                            descricao: { type: "string" },
                            natureza: { type: "string" },
                            tipocontacontabil: { type: "string" },
                            codigoreduzido: { type: "string" },
                            codigoextenso: { type: "string" },
                            nivelconta: { type: "number" },
                            inativo: { type: "number" },
                            currenttimemillis: { type: "number" },
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
        400: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
            },
        },
        401: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
            },
        },
        500: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
            },
        },
    },
};

export const atualizarContaContabilSchema: FastifySchema = {
    tags: ["conta-contabil"],
    summary: "Atualizar conta contábil",
    description:
        "Atualiza os dados de uma conta contábil existente. Apenas os campos fornecidos serão atualizados.",
    security: [{ bearerAuth: [] }],
    params: {
        type: "object",
        properties: {
            id: { type: "string", description: "ID único da conta contábil" },
        },
        required: ["id"],
    },
    body: {
        type: "object",
        properties: {
            descricao: {
                type: "string",
                maxLength: 100,
                description: "Descrição da conta contábil",
            },
            natureza: {
                type: "string",
                maxLength: 1,
                description: "Natureza da conta (D/C)",
            },
            tipocontacontabil: {
                type: "string",
                maxLength: 1,
                description: "Tipo da conta (S/A)",
            },
            codigoreduzido: {
                type: "string",
                maxLength: 20,
                description: "Código reduzido",
            },
            inativo: {
                type: "number",
                description: "Status: 0 = ativo, 1 = inativo",
            },
        },
        additionalProperties: false,
    },
    response: {
        200: {
            type: "object",
            description: "Conta contábil atualizada com sucesso",
            properties: {
                id: { type: "string" },
                idempresa: { type: "string" },
                descricao: { type: "string" },
                natureza: { type: "string" },
                tipocontacontabil: { type: "string" },
                codigoreduzido: { type: "string" },
                currenttimemillis: { type: "number" },
            },
        },
        400: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
                details: { type: "array" },
            },
        },
        401: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
            },
        },
        403: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
            },
        },
        404: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
            },
        },
        500: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
            },
        },
    },
};

export const excluirContaContabilSchema: FastifySchema = {
    tags: ["conta-contabil"],
    summary: "Excluir conta contábil",
    description:
        "Exclui uma conta contábil existente. Uma auditoria é registrada antes da exclusão.",
    security: [{ bearerAuth: [] }],
    params: {
        type: "object",
        properties: {
            id: { type: "string", description: "ID da conta contábil a ser excluída" },
        },
        required: ["id"],
    },
    response: {
        200: {
            type: "null",
            description: "Conta contábil excluída com sucesso",
        },
        401: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
            },
        },
        403: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
            },
        },
        404: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
            },
        },
        500: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
            },
        },
    },
};

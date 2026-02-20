export const atualizarEntidadeSchema = {
    tags: ["entidades"],
    summary: "Atualizar entidade",
    description: "Atualiza os dados de um entidade existente",
    security: [{ bearerAuth: [] }],
    params: {
        type: "object",
        properties: {
            id: { type: "string", format: "uuid" },
        },
        required: ["id"],
    },
    body: {
        type: "object",
        properties: {
            nome: { type: "string" },
            cnpjcpf: { type: "string" },
            razaosocial: { type: "string", nullable: true },
            tipopessoa: { type: "number", nullable: true },
            inscricaoestadual: { type: "string", nullable: true },
            rg: { type: "string", nullable: true },
            email: { type: "string", format: "email", nullable: true },
            telefone: { type: "string", nullable: true },
            endereco: { type: "string", nullable: true },
            numeroendereco: { type: "string", nullable: true },
            complemento: { type: "string", nullable: true },
            bairro: { type: "string", nullable: true },
            idcidade: { type: "string", nullable: true },
            idestado: { type: "string", nullable: true },
            cep: { type: "string", nullable: true },
            fax: { type: "string", nullable: true },
            nascimento: { type: "string", nullable: true },
            idplanocontas: { type: "string", nullable: true },
            pais: { type: "string", nullable: true },
        },
        additionalProperties: false,
    },
    response: {
        200: {
            type: "object",
            properties: {
                id: { type: "string" },
                nome: { type: "string" },
                cnpjcpf: { type: "string" },
                razaosocial: { type: "string", nullable: true },
                tipopessoa: { type: "number", nullable: true },
                inscricaoestadual: { type: "string", nullable: true },
                rg: { type: "string", nullable: true },
                email: { type: "string", nullable: true },
                telefone: { type: "string", nullable: true },
                endereco: { type: "string", nullable: true },
                numeroendereco: { type: "string", nullable: true },
                complemento: { type: "string", nullable: true },
                bairro: { type: "string", nullable: true },
                idcidade: { type: "string", nullable: true },
                idestado: { type: "string", nullable: true },
                cep: { type: "string", nullable: true },
                fax: { type: "string", nullable: true },
                nascimento: { type: "string", nullable: true },
                idplanocontas: { type: "string", nullable: true },
                pais: { type: "string", nullable: true },
                idempresa: { type: "string" },
                criadoem: { type: "string" },
                atualizadoem: { type: "string" },
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
        409: {
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
export const buscarEntidadeSchema = {
    tags: ["entidades"],
    summary: "Buscar entidade por ID",
    description: "Retorna os dados de um entidade específico",
    security: [{ bearerAuth: [] }],
    params: {
        type: "object",
        properties: {
            id: { type: "string", format: "uuid" },
        },
        required: ["id"],
    },
    response: {
        200: {
            type: "object",
            properties: {
                id: { type: "string" },
                nome: { type: "string" },
                email: { type: "string", nullable: true },
                telefone: { type: "string", nullable: true },
                endereco: { type: "string", nullable: true },
                cidade: { type: "string", nullable: true },
                estado: { type: "string", nullable: true },
                cep: { type: "string", nullable: true },
                pais: { type: "string", nullable: true },
                idempresa: { type: "string" },
                criadoem: { type: "string" },
                atualizadoem: { type: "string" },
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
        404: {
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
export const criarEntidadeSchema = {
    tags: ["entidades"],
    summary: "Criar novo entidade",
    description: "Cria um novo entidade na empresa do usuário autenticado",
    security: [{ bearerAuth: [] }],
    body: {
        type: "object",
        properties: {
            nome: { type: "string" },
            cnpjcpf: { type: "string" },
            razaosocial: { type: "string", nullable: true },
            tipopessoa: { type: "number", nullable: true },
            inscricaoestadual: { type: "string", nullable: true },
            rg: { type: "string", nullable: true },
            email: { type: "string", format: "email", nullable: true },
            telefone: { type: "string", nullable: true },
            endereco: { type: "string", nullable: true },
            numeroendereco: { type: "string", nullable: true },
            complemento: { type: "string", nullable: true },
            bairro: { type: "string", nullable: true },
            idcidade: { type: "string", nullable: true },
            idestado: { type: "string", nullable: true },
            cep: { type: "string", nullable: true },
            fax: { type: "string", nullable: true },
            nascimento: { type: "string", nullable: true },
            idplanocontas: { type: "string", nullable: true },
            pais: { type: "string", nullable: true },
            idempresa: { type: "string", format: "uuid" },
        },
        required: ["nome", "cnpjcpf", "idempresa"],
    },
    response: {
        201: {
            type: "object",
            properties: {
                id: { type: "string" },
                nome: { type: "string" },
                cnpjcpf: { type: "string" },
                razaosocial: { type: "string", nullable: true },
                tipopessoa: { type: "number", nullable: true },
                inscricaoestadual: { type: "string", nullable: true },
                rg: { type: "string", nullable: true },
                email: { type: "string", nullable: true },
                telefone: { type: "string", nullable: true },
                endereco: { type: "string", nullable: true },
                numeroendereco: { type: "string", nullable: true },
                complemento: { type: "string", nullable: true },
                bairro: { type: "string", nullable: true },
                idcidade: { type: "string", nullable: true },
                idestado: { type: "string", nullable: true },
                cep: { type: "string", nullable: true },
                fax: { type: "string", nullable: true },
                nascimento: { type: "string", nullable: true },
                idplanocontas: { type: "string", nullable: true },
                pais: { type: "string", nullable: true },
                idempresa: { type: "string" },
                criadoem: { type: "string" },
                atualizadoem: { type: "string" },
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
        403: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
            },
        },
        409: {
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
export const excluirEntidadeSchema = {
    tags: ["entidades"],
    summary: "Excluir entidade",
    description: "Exclui um entidade existente",
    security: [{ bearerAuth: [] }],
    params: {
        type: "object",
        properties: {
            id: { type: "string", format: "uuid" },
        },
        required: ["id"],
    },
    response: {
        204: {
            type: "null",
            description: "Entidade excluído com sucesso",
        },
        400: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
                details: { type: "string" },
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
export const listarEntidadesSchema = {
    tags: ["entidades"],
    summary: "Listar entidades",
    description: "Lista os entidades da empresa do usuário autenticado com paginação e filtros",
    security: [{ bearerAuth: [] }],
    querystring: {
        type: "object",
        properties: {
            page: { type: "number" },
            limit: { type: "number" },
            idempresa: { type: "string", format: "uuid" },
            nome: { type: "string" },
            email: { type: "string" },
            telefone: { type: "string" },
        },
        required: ["page", "limit", "idempresa"],
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
                            nome: { type: "string" },
                            cnpjcpf: { type: "string" },
                            razaosocial: { type: "string", nullable: true },
                            tipopessoa: { type: "number", nullable: true },
                            inscricaoestadual: { type: "string", nullable: true },
                            rg: { type: "string", nullable: true },
                            email: { type: "string", nullable: true },
                            telefone: { type: "string", nullable: true },
                            endereco: { type: "string", nullable: true },
                            numeroendereco: { type: "string", nullable: true },
                            complemento: { type: "string", nullable: true },
                            bairro: { type: "string", nullable: true },
                            idcidade: { type: "string", nullable: true },
                            idestado: { type: "string", nullable: true },
                            cep: { type: "string", nullable: true },
                            fax: { type: "string", nullable: true },
                            nascimento: { type: "string", nullable: true },
                            idplanocontas: { type: "string", nullable: true },
                            pais: { type: "string", nullable: true },
                            idempresa: { type: "string" },
                            criadoem: { type: "string" },
                            atualizadoem: { type: "string" },
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
        500: {
            type: "object",
            properties: {
                error: { type: "string" },
                code: { type: "string" },
            },
        },
    },
};
//# sourceMappingURL=schemas.js.map
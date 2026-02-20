import type { FastifyInstance } from "fastify";
import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarContaContabil } from "./atualizar.js";
import { buscarContaContabil } from "./buscar.js";
import { criarContaContabil } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirContaContabil } from "./excluir.js";
import { listarContasContabeis } from "./listar.js";

export async function contaContabilRotas(app: FastifyInstance) {
    app.addHook("onRequest", verifyJwt);

    app.post("/conta-contabil", {
        schema: schema.criarContaContabilSchema,
        handler: criarContaContabil,
    });
    app.get("/conta-contabil", {
        schema: schema.listarContasContabeisSchema,
        handler: listarContasContabeis,
    });
    app.get("/conta-contabil/:id", {
        schema: schema.buscarContaContabilSchema,
        handler: buscarContaContabil,
    });
    app.put("/conta-contabil/:id", {
        schema: schema.atualizarContaContabilSchema,
        handler: atualizarContaContabil,
    });
    app.delete("/conta-contabil/:id", {
        schema: schema.excluirContaContabilSchema,
        handler: excluirContaContabil,
    });
}

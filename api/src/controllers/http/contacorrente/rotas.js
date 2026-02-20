import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarContaCorrente } from "./atualizar.js";
import { buscarContaCorrente } from "./buscar.js";
import { criarContaCorrente } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirContaCorrente } from "./excluir.js";
import { listarContasCorrentes } from "./listar.js";
export async function contaCorrenteRotas(app) {
    app.addHook("onRequest", verifyJwt);
    app.post("/contas-correntes", {
        schema: schema.criarContaCorrenteSchema,
        handler: criarContaCorrente,
    });
    app.get("/contas-correntes", {
        schema: schema.listarContasCorrentesSchema,
        handler: listarContasCorrentes,
    });
    app.get("/contas-correntes/:id", {
        schema: schema.buscarContaCorrenteSchema,
        handler: buscarContaCorrente,
    });
    app.put("/contas-correntes/:id", {
        schema: schema.atualizarContaCorrenteSchema,
        handler: atualizarContaCorrente,
    });
    app.delete("/contas-correntes/:id", {
        schema: schema.excluirContaCorrenteSchema,
        handler: excluirContaCorrente,
    });
}
//# sourceMappingURL=rotas.js.map
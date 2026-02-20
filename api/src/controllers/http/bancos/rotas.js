import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarBanco } from "./atualizar.js";
import { buscarBanco } from "./buscar.js";
import { criarBanco } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirBanco } from "./excluir.js";
import { listarBancos } from "./listar.js";
export async function bancosRotas(app) {
    app.addHook("onRequest", verifyJwt);
    app.post("/bancos", {
        schema: schema.criarBancoSchema,
        handler: criarBanco,
    });
    app.get("/bancos", {
        schema: schema.listarBancosSchema,
        handler: listarBancos,
    });
    app.get("/bancos/:id", {
        schema: schema.buscarBancoSchema,
        handler: buscarBanco,
    });
    app.put("/bancos/:id", {
        schema: schema.atualizarBancoSchema,
        handler: atualizarBanco,
    });
    app.delete("/bancos/:id", {
        schema: schema.excluirBancoSchema,
        handler: excluirBanco,
    });
}
//# sourceMappingURL=rotas.js.map
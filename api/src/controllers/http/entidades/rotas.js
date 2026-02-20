import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarEntidade } from "./atualizar.js";
import { buscarEntidade } from "./buscar.js";
import { criarEntidade } from "./criar.js";
import * as schema from "./doc-schema/schemas.js";
import { excluirEntidade } from "./excluir.js";
import { listarEntidades } from "./listar-entidades.js";
export async function entidadesRotas(app) {
    app.addHook("onRequest", verifyJwt);
    app.post("/entidades", {
        schema: schema.criarEntidadeSchema,
        handler: criarEntidade,
    });
    app.get("/entidades", {
        schema: schema.listarEntidadesSchema,
        handler: listarEntidades,
    });
    app.get("/entidades/:id", {
        schema: schema.buscarEntidadeSchema,
        handler: buscarEntidade,
    });
    app.put("/entidades/:id", {
        schema: schema.atualizarEntidadeSchema,
        handler: atualizarEntidade,
    });
    app.delete("/entidades/:id", {
        schema: schema.excluirEntidadeSchema,
        handler: excluirEntidade,
    });
}
//# sourceMappingURL=rotas.js.map
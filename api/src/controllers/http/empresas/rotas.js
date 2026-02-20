import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarEmpresa } from "./atualizar.js";
import { buscarEmpresa } from "./buscar.js";
import { criarEmpresa } from "./criar.js";
import * as schema from "./doc-schema/schema.js";
import { excluirEmpresa } from "./excluir.js";
import { listarEmpresas } from "./listar-empresas.js";
export async function empresasRotas(app) {
    app.addHook("onRequest", verifyJwt);
    app.post("/empresas", {
        schema: schema.criarEmpresaSchema,
        handler: criarEmpresa,
    });
    app.get("/empresas", {
        schema: schema.listarEmpresasSchema,
        handler: listarEmpresas,
    });
    app.get("/empresas/:id", {
        schema: schema.buscarEmpresaSchema,
        handler: buscarEmpresa,
    });
    app.put("/empresas/:id", {
        schema: schema.atualizarEmpresaSchema,
        handler: atualizarEmpresa,
    });
    app.delete("/empresas/:id", {
        schema: schema.excluirEmpresaSchema,
        handler: excluirEmpresa,
    });
}
//# sourceMappingURL=rotas.js.map
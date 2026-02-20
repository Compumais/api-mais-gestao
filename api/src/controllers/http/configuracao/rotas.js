import { verifyJwt } from "../../middleware/verify-jwt.js";
import { atualizarConfiguracao } from "./atualizar.js";
import { atualizarSecaoConfiguracao } from "./atualizar-secao.js";
import { atualizarWebhook } from "./atualizar-webhook.js";
import { buscarConfiguracao } from "./buscar.js";
import { criarChaveApi } from "./criar-chave-api.js";
import { criarWebhook } from "./criar-webhook.js";
import { deletarChaveApi } from "./deletar-chave-api.js";
import { deletarWebhook } from "./deletar-webhook.js";
import * as schema from "./doc-schema/schema.js";
export async function configuracaoRotas(app) {
    app.addHook("onRequest", verifyJwt);
    app.get("/configuracoes", {
        schema: schema.buscarConfiguracaoSchema,
        handler: buscarConfiguracao,
    });
    app.put("/configuracoes", {
        schema: schema.atualizarConfiguracaoSchema,
        handler: atualizarConfiguracao,
    });
    app.patch("/configuracoes/:idempresa/secao/:secao", {
        schema: schema.atualizarSecaoConfiguracaoSchema,
        handler: atualizarSecaoConfiguracao,
    });
    app.post("/configuracoes/:idempresa/chaves-api", {
        schema: schema.criarChaveApiSchema,
        handler: criarChaveApi,
    });
    app.delete("/configuracoes/:idempresa/chaves-api/:chaveId", {
        schema: schema.deletarChaveApiSchema,
        handler: deletarChaveApi,
    });
    app.post("/configuracoes/:idempresa/webhooks", {
        schema: schema.criarWebhookSchema,
        handler: criarWebhook,
    });
    app.put("/configuracoes/:idempresa/webhooks/:webhookId", {
        schema: schema.atualizarWebhookSchema,
        handler: atualizarWebhook,
    });
    app.delete("/configuracoes/:idempresa/webhooks/:webhookId", {
        schema: schema.deletarWebhookSchema,
        handler: deletarWebhook,
    });
}
//# sourceMappingURL=rotas.js.map
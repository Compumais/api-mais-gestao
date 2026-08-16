package com.pos_mais_gestao.data.api;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.pos_mais_gestao.data.local.PrefsStore;
import java.io.IOException;
import java.util.concurrent.TimeUnit;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

/** Cliente HTTP da API LAN do PDV desktop (`/pos/*`). */
public class LocalPdvApi {
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

    private final PrefsStore prefsStore;
    private final OkHttpClient httpClient;
    private final OkHttpClient pingClient;

    public LocalPdvApi(PrefsStore prefsStore) {
        this.prefsStore = prefsStore;
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(8, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(20, TimeUnit.SECONDS)
                .build();
        this.pingClient = new OkHttpClient.Builder()
                .connectTimeout(3, TimeUnit.SECONDS)
                .readTimeout(4, TimeUnit.SECONDS)
                .build();
    }

    public JsonObject ping() throws ApiException {
        return get("/pos/health", false, pingClient);
    }

    public JsonObject login(String email, String password) throws ApiException {
        JsonObject body = new JsonObject();
        body.addProperty("email", email);
        body.addProperty("password", password);
        return post("/pos/login", body.toString(), false);
    }

    public JsonObject listarEmpresas() throws ApiException {
        return get("/pos/empresas", true, httpClient);
    }

    public JsonObject selecionarEmpresa(String id, String nome) throws ApiException {
        JsonObject body = new JsonObject();
        body.addProperty("idempresa", id);
        body.addProperty("nomeempresa", nome);
        return post("/pos/empresa", body.toString(), true);
    }

    public JsonObject status() throws ApiException {
        return get("/pos/status", true, httpClient);
    }

    public JsonObject sync() throws ApiException {
        return get("/pos/sync", true, httpClient);
    }

    public JsonObject listarMesas() throws ApiException {
        return get("/pos/mesas", true, httpClient);
    }

    public JsonObject abrirMesa(int numero, String nomeCliente) throws ApiException {
        JsonObject body = new JsonObject();
        if (nomeCliente != null && !nomeCliente.trim().isEmpty()) {
            body.addProperty("nomecliente", nomeCliente.trim());
        }
        return post("/pos/mesas/" + numero + "/abrir", body.toString(), true);
    }

    public JsonObject obterConta(String id) throws ApiException {
        return get("/pos/contas/" + id, true, httpClient);
    }

    public JsonObject adicionarItem(String idConta, JsonObject item) throws ApiException {
        return post("/pos/contas/" + idConta + "/itens", item.toString(), true);
    }

    public JsonObject fecharConta(String idConta, String meio) throws ApiException {
        JsonObject body = new JsonObject();
        body.addProperty("meio", meio);
        return post("/pos/contas/" + idConta + "/fechar", body.toString(), true);
    }

    public JsonObject vendaRapida(JsonObject body) throws ApiException {
        return post("/pos/vendas/rapida", body.toString(), true);
    }

    public JsonObject listarVendas() throws ApiException {
        return get("/pos/vendas", true, httpClient);
    }

    public JsonObject obterVenda(String id) throws ApiException {
        return get("/pos/vendas/" + id, true, httpClient);
    }

    public JsonObject atualizarNomeConta(String idConta, String nomeCliente) throws ApiException {
        JsonObject body = new JsonObject();
        body.addProperty("nomecliente", nomeCliente == null ? "" : nomeCliente);
        return put("/pos/contas/" + idConta + "/nome", body.toString());
    }

    public JsonObject enviarPedido(String idConta, JsonObject body) throws ApiException {
        return post("/pos/contas/" + idConta + "/pedido", body.toString(), true);
    }

    public JsonObject listarPedidos(boolean pendentes) throws ApiException {
        return get("/pos/pedidos?pendentes=" + (pendentes ? "1" : "0"), true, httpClient);
    }

    public JsonObject marcarPedidoEntregue(String id) throws ApiException {
        return post("/pos/pedidos/" + id + "/entregue", "{}", true);
    }

    public JsonObject limparFilaPedidos() throws ApiException {
        return post("/pos/pedidos/limpar-fila", "{}", true);
    }

    private JsonObject put(String path, String json) throws ApiException {
        Request.Builder builder = new Request.Builder()
                .url(base() + path)
                .put(RequestBody.create(json, JSON));
        aplicarAuth(builder);
        return execute(httpClient, builder.build());
    }

    private JsonObject get(String path, boolean auth, OkHttpClient client) throws ApiException {
        Request.Builder builder = new Request.Builder().url(base() + path).get();
        if (auth) {
            aplicarAuth(builder);
        }
        return execute(client, builder.build());
    }

    private JsonObject post(String path, String json, boolean auth) throws ApiException {
        Request.Builder builder = new Request.Builder()
                .url(base() + path)
                .post(RequestBody.create(json, JSON));
        if (auth) {
            aplicarAuth(builder);
        }
        return execute(httpClient, builder.build());
    }

    private void aplicarAuth(Request.Builder builder) {
        String token = prefsStore.getToken();
        if (token != null && !token.isEmpty()) {
            builder.header("Authorization", "Bearer " + token);
        }
    }

    private String base() {
        return prefsStore.getBaseUrl();
    }

    private JsonObject execute(OkHttpClient client, Request request) throws ApiException {
        try (Response response = client.newCall(request).execute()) {
            ResponseBody body = response.body();
            String raw = body != null ? body.string() : "";
            JsonObject json = parseJson(raw);
            if (!response.isSuccessful()) {
                String erro = json.has("error") && !json.get("error").isJsonNull()
                        ? json.get("error").getAsString()
                        : "HTTP " + response.code();
                throw new ApiException(erro, response.code());
            }
            return json;
        } catch (ApiException e) {
            throw e;
        } catch (IOException e) {
            throw new ApiException("PDV local indisponível. Verifique IP, porta e se o desktop está ligado.", 0);
        }
    }

    private JsonObject parseJson(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return new JsonObject();
        }
        try {
            JsonElement el = JsonParser.parseString(raw);
            if (el.isJsonObject()) {
                return el.getAsJsonObject();
            }
            if (el.isJsonArray()) {
                JsonObject obj = new JsonObject();
                obj.add("data", el.getAsJsonArray());
                return obj;
            }
            JsonObject obj = new JsonObject();
            obj.addProperty("raw", raw);
            return obj;
        } catch (Exception e) {
            JsonObject obj = new JsonObject();
            obj.addProperty("raw", raw);
            return obj;
        }
    }
}

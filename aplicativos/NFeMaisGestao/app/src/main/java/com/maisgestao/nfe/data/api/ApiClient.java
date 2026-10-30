package com.maisgestao.nfe.data.api;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.maisgestao.nfe.data.api.dto.CfopDto;
import com.maisgestao.nfe.data.api.dto.CondicaoPagamentoDto;
import com.maisgestao.nfe.data.api.dto.EmpresaDto;
import com.maisgestao.nfe.data.api.dto.EntidadeDto;
import com.maisgestao.nfe.data.api.dto.EstadoDto;
import com.maisgestao.nfe.data.api.dto.MunicipioDto;
import com.maisgestao.nfe.data.api.dto.NotaFiscalDto;
import com.maisgestao.nfe.data.api.dto.PlanoContasDto;
import com.maisgestao.nfe.data.api.dto.ProdutoDto;
import com.maisgestao.nfe.data.api.dto.SerieDto;
import com.maisgestao.nfe.data.api.dto.TipoDocumentoFinanceiroDto;
import com.maisgestao.nfe.data.local.PrefsStore;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

public class ApiClient {
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");

    private final PrefsStore prefsStore;
    private final Gson gson = new Gson();
    private final OkHttpClient httpClient;

    public ApiClient(PrefsStore prefsStore) {
        this.prefsStore = prefsStore;
        this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(20, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .writeTimeout(60, TimeUnit.SECONDS)
                .build();
    }

    public static final class Pagina<T> {
        public final List<T> data;
        public final int page;
        public final int total;
        public final int totalPages;

        Pagina(List<T> data, int page, int total, int totalPages) {
            this.data = data;
            this.page = page;
            this.total = total;
            this.totalPages = totalPages;
        }
    }

    public void validarSessao() throws ApiException {
        getJson("/api/auth/get-session");
    }

    public void login(String email, String password) throws ApiException {
        String identificador = email == null ? "" : email.trim();
        JsonObject body = new JsonObject();
        body.addProperty("email", identificador);
        body.addProperty("login", identificador);
        body.addProperty("password", password);

        JsonObject response = postJson("/api/auth/sign-in/email", body.toString(), false);
        String token = extrairToken(response);
        if (token == null || token.isEmpty()) {
            throw new ApiException("Sessão sem token. Verifique a API.");
        }

        String userId = null;
        String userName = null;
        if (response.has("user") && response.get("user").isJsonObject()) {
            JsonObject user = response.getAsJsonObject("user");
            userId = texto(user, "id");
            userName = texto(user, "name");
            if (userName == null) {
                userName = texto(user, "nome");
            }
        }

        prefsStore.setToken(token);
        prefsStore.setUser(userId, userName);
    }

    public JsonObject getPerfil() throws ApiException {
        return getJson("/api/auth/perfil");
    }

    public void logout() throws ApiException {
        try {
            postJson("/api/auth/logout", "{}", true);
        } catch (ApiException ignored) {
            // ignore
        }
        prefsStore.logout();
    }

    public List<EmpresaDto> listarEmpresas() throws ApiException {
        String userId = prefsStore.getUserId();
        String path = "/empresas?page=1&limit=100";
        if (userId != null && !userId.isEmpty()) {
            path += "&idusuario=" + encode(userId);
        }
        JsonObject response = getJson(path);
        return parseLista(response, EmpresaDto.class);
    }

    public JsonObject dashboard(String idempresa) throws ApiException {
        return getJson("/dashboard?idempresa=" + encode(idempresa));
    }

    public JsonObject dashboardExecutivo(String idempresa, String preset) throws ApiException {
        String p = preset == null || preset.isEmpty() ? "mes_atual" : preset;
        return getJson("/dashboard/executivo?idempresa=" + encode(idempresa) + "&preset=" + encode(p));
    }

    public Pagina<ProdutoDto> listarProdutos(String idempresa, int page, int limit, String q)
            throws ApiException {
        StringBuilder path = new StringBuilder("/produtos?idempresa=")
                .append(encode(idempresa))
                .append("&page=")
                .append(page)
                .append("&limit=")
                .append(limit);
        if (q != null && !q.trim().isEmpty()) {
            path.append("&q=").append(encode(q.trim()));
        }
        JsonObject response = getJson(path.toString());
        return parsePagina(response, ProdutoDto.class);
    }

    public ProdutoDto buscarProduto(String id) throws ApiException {
        JsonObject response = getJson("/produtos/" + encode(id));
        return gson.fromJson(response, ProdutoDto.class);
    }

    public ProdutoDto criarProduto(JsonObject body) throws ApiException {
        JsonObject response = postJson("/produtos", body.toString(), true);
        return gson.fromJson(response, ProdutoDto.class);
    }

    public ProdutoDto atualizarProduto(String id, JsonObject body) throws ApiException {
        JsonObject response = putJson("/produtos/" + encode(id), body.toString());
        return gson.fromJson(response, ProdutoDto.class);
    }

    public int proximoCodigo(String idempresa) throws ApiException {
        JsonObject response = getJson("/produtos/proximo-codigo?idempresa=" + encode(idempresa));
        if (response.has("codigo") && !response.get("codigo").isJsonNull()) {
            return response.get("codigo").getAsInt();
        }
        return 1;
    }

    public List<JsonObject> listarUnidades(String idempresa) throws ApiException {
        JsonObject response = getJson("/unidades-medida?idempresa=" + encode(idempresa) + "&limit=200");
        return parseLista(response, JsonObject.class);
    }

    public Pagina<EntidadeDto> listarClientes(String idempresa, int page, int limit, String q)
            throws ApiException {
        StringBuilder path = new StringBuilder("/entidades?idempresa=")
                .append(encode(idempresa))
                .append("&cliente=1&page=")
                .append(page)
                .append("&limit=")
                .append(limit);
        if (q != null && !q.trim().isEmpty()) {
            path.append("&q=").append(encode(q.trim()));
        }
        JsonObject response = getJson(path.toString());
        return parsePagina(response, EntidadeDto.class);
    }

    public EntidadeDto buscarEntidade(String id) throws ApiException {
        JsonObject response = getJson("/entidades/" + encode(id));
        return gson.fromJson(response, EntidadeDto.class);
    }

    public EntidadeDto criarEntidade(JsonObject body) throws ApiException {
        JsonObject response = postJson("/entidades", body.toString(), true);
        return gson.fromJson(response, EntidadeDto.class);
    }

    public EntidadeDto atualizarEntidade(String id, JsonObject body) throws ApiException {
        JsonObject response = putJson("/entidades/" + encode(id), body.toString());
        return gson.fromJson(response, EntidadeDto.class);
    }

    public List<EstadoDto> listarEstados() throws ApiException {
        JsonObject response = getJson("/localidades/estados");
        return parseLista(response, EstadoDto.class);
    }

    public List<MunicipioDto> listarMunicipios(String uf) throws ApiException {
        JsonObject response = getJson("/localidades/estados/" + encode(uf) + "/municipios");
        return parseLista(response, MunicipioDto.class);
    }

    public JsonObject buscarEnderecoPorCep(String cep) throws ApiException {
        String limpo = cep == null ? "" : cep.replaceAll("\\D", "");
        return getJson("/localidades/cep/" + encode(limpo));
    }

    public List<PlanoContasDto> listarPlanoContas(String idempresa) throws ApiException {
        String path = "/plano-contas?idempresa="
                + encode(idempresa)
                + "&page=1&limit=1000&listarTudo=true&inativo=0";
        JsonObject response = getJson(path);
        return parseLista(response, PlanoContasDto.class);
    }

    public Pagina<NotaFiscalDto> listarNfes(String idempresa, int page, int limit) throws ApiException {
        String path = "/nfe/emissao?idempresa=" + encode(idempresa) + "&page=" + page + "&limit=" + limit;
        JsonObject response = getJson(path);
        return parsePagina(response, NotaFiscalDto.class);
    }

    public Pagina<NotaFiscalDto> listarRascunhos(String idempresa, int page, int limit) throws ApiException {
        String path = "/nfe/emissao/rascunhos?idempresa=" + encode(idempresa) + "&page=" + page + "&limit=" + limit;
        JsonObject response = getJson(path);
        return parsePagina(response, NotaFiscalDto.class);
    }

    public void excluirRascunho(String id, String idempresa) throws ApiException {
        deleteJson("/nfe/emissao/rascunhos/" + encode(id) + "?idempresa=" + encode(idempresa));
    }

    public JsonObject buscarNota(String id) throws ApiException {
        return getJson("/notas-fiscais/" + encode(id));
    }

    public JsonObject emitir(JsonObject payload) throws ApiException {
        return postJson("/nfe/emissao", payload.toString(), true);
    }

    public JsonObject salvarRascunho(JsonObject payload) throws ApiException {
        return postJson("/nfe/emissao/rascunho", payload.toString(), true);
    }

    public JsonObject transmitir(String id, boolean confirmarProducao) throws ApiException {
        JsonObject body = new JsonObject();
        body.addProperty("confirmarProducao", confirmarProducao);
        return postJson("/nfe/emissao/" + encode(id) + "/transmitir", body.toString(), true);
    }

    public JsonObject cancelar(String id, String justificativa) throws ApiException {
        JsonObject body = new JsonObject();
        body.addProperty("justificativa", justificativa);
        return postJson("/nfe/emissao/" + encode(id) + "/cancelar", body.toString(), true);
    }

    public JsonObject inutilizar(String id, String justificativa) throws ApiException {
        JsonObject body = new JsonObject();
        body.addProperty("justificativa", justificativa);
        return postJson("/nfe/emissao/" + encode(id) + "/inutilizar", body.toString(), true);
    }

    public JsonObject calcularTributos(JsonObject params) throws ApiException {
        return postJson("/nfe/emissao/calcular-tributos", params.toString(), true);
    }

    public JsonObject calcularObservacoes(JsonObject params) throws ApiException {
        return postJson("/nfe/emissao/calcular-observacoes", params.toString(), true);
    }

    public byte[] downloadDanfe(String id) throws ApiException {
        return getBytes("/notas-fiscais/" + encode(id) + "/danfe");
    }

    public List<SerieDto> listarSeries(String idempresa, Integer ambiente) throws ApiException {
        StringBuilder path = new StringBuilder("/nfe-series?idempresa=")
                .append(encode(idempresa))
                .append("&modelo=55");
        if (ambiente != null) {
            path.append("&ambiente=").append(ambiente);
        }
        JsonObject response = getJson(path.toString());
        return parseLista(response, SerieDto.class);
    }

    public JsonObject buscarNfeConfig(String idempresa) throws ApiException {
        return getJson("/empresas/" + encode(idempresa) + "/nfe-configuracao");
    }

    public List<CfopDto> listarCfopsSaida(String idempresa) throws ApiException {
        String path = "/cfops?idempresa="
                + encode(idempresa)
                + "&tipomovimento=S&page=1&limit=200";
        JsonObject response = getJson(path);
        return parseLista(response, CfopDto.class);
    }

    public List<CondicaoPagamentoDto> listarCondicoesPagamento(String idempresa) throws ApiException {
        String path = "/condicoes-pagamento?idempresa="
                + encode(idempresa)
                + "&inativo=0&page=1&limit=200";
        JsonObject response = getJson(path);
        return parseLista(response, CondicaoPagamentoDto.class);
    }

    public List<PlanoContasDto> listarPlanoContasReceita(String idempresa) throws ApiException {
        String path = "/plano-contas?idempresa="
                + encode(idempresa)
                + "&tipomovimento=E&listarTudo=true&page=1&limit=200";
        JsonObject response = getJson(path);
        return parseLista(response, PlanoContasDto.class);
    }

    public List<TipoDocumentoFinanceiroDto> listarTiposDocumentoFinanceiro(String idempresa)
            throws ApiException {
        String path = "/tipos-documento-financeiro?idempresa="
                + encode(idempresa)
                + "&inativo=0&page=1&limit=200";
        JsonObject response = getJson(path);
        return parseLista(response, TipoDocumentoFinanceiroDto.class);
    }

    private <T> List<T> parseLista(JsonObject response, Class<T> type) {
        JsonArray data = response.getAsJsonArray("data");
        List<T> lista = new ArrayList<>();
        if (data == null) {
            return lista;
        }
        for (JsonElement element : data) {
            T item = gson.fromJson(element, type);
            if (item != null) {
                lista.add(item);
            }
        }
        return lista;
    }

    private <T> Pagina<T> parsePagina(JsonObject response, Class<T> type) {
        List<T> lista = parseLista(response, type);
        int page = 1;
        int total = lista.size();
        int totalPages = 1;
        if (response.has("paginacao") && response.get("paginacao").isJsonObject()) {
            JsonObject pag = response.getAsJsonObject("paginacao");
            if (pag.has("page")) {
                page = pag.get("page").getAsInt();
            }
            if (pag.has("total")) {
                total = pag.get("total").getAsInt();
            }
            if (pag.has("totalPages")) {
                totalPages = pag.get("totalPages").getAsInt();
            }
        }
        return new Pagina<>(lista, page, total, totalPages);
    }

    private String extrairToken(JsonObject response) {
        String token = texto(response, "token");
        if (token != null && !token.isEmpty()) {
            return token;
        }
        if (response.has("session") && response.get("session").isJsonObject()) {
            JsonObject session = response.getAsJsonObject("session");
            return texto(session, "token");
        }
        return null;
    }

    private JsonObject getJson(String path) throws ApiException {
        Request.Builder builder = new Request.Builder().url(prefsStore.getBaseUrl() + path).get();
        aplicarAuth(builder);
        aplicarEmpresa(builder);
        return execute(builder.build());
    }

    private byte[] getBytes(String path) throws ApiException {
        Request.Builder builder = new Request.Builder().url(prefsStore.getBaseUrl() + path).get();
        aplicarAuth(builder);
        aplicarEmpresa(builder);
        try (Response response = httpClient.newCall(builder.build()).execute()) {
            ResponseBody responseBody = response.body();
            byte[] raw = responseBody != null ? responseBody.bytes() : new byte[0];
            if (!response.isSuccessful()) {
                String message = extrairErro(new String(raw));
                throw new ApiException(message, response.code());
            }
            return raw;
        } catch (ApiException e) {
            throw e;
        } catch (IOException e) {
            throw new ApiException("Falha de rede: " + e.getMessage());
        }
    }

    private JsonObject postJson(String path, String jsonBody, boolean autenticado) throws ApiException {
        RequestBody body = RequestBody.create(jsonBody, JSON);
        Request.Builder builder = new Request.Builder()
                .url(prefsStore.getBaseUrl() + path)
                .post(body)
                .header("Content-Type", "application/json");
        if (autenticado) {
            aplicarAuth(builder);
        }
        aplicarEmpresa(builder);
        return execute(builder.build());
    }

    private JsonObject putJson(String path, String jsonBody) throws ApiException {
        RequestBody body = RequestBody.create(jsonBody, JSON);
        Request.Builder builder = new Request.Builder()
                .url(prefsStore.getBaseUrl() + path)
                .put(body)
                .header("Content-Type", "application/json");
        aplicarAuth(builder);
        aplicarEmpresa(builder);
        return execute(builder.build());
    }

    private void deleteJson(String path) throws ApiException {
        Request.Builder builder = new Request.Builder().url(prefsStore.getBaseUrl() + path).delete();
        aplicarAuth(builder);
        aplicarEmpresa(builder);
        execute(builder.build());
    }

    private JsonObject execute(Request request) throws ApiException {
        try (Response response = httpClient.newCall(request).execute()) {
            ResponseBody responseBody = response.body();
            String raw = responseBody != null ? responseBody.string() : "";
            if (!response.isSuccessful()) {
                String message = extrairErro(raw);
                throw new ApiException(message, response.code());
            }
            if (raw == null || raw.trim().isEmpty()) {
                return new JsonObject();
            }
            JsonElement element = JsonParser.parseString(raw);
            if (element.isJsonObject()) {
                return element.getAsJsonObject();
            }
            JsonObject wrapper = new JsonObject();
            wrapper.add("data", element);
            return wrapper;
        } catch (ApiException e) {
            throw e;
        } catch (IOException e) {
            throw new ApiException("Falha de rede: " + e.getMessage());
        } catch (Exception e) {
            throw new ApiException("Erro ao processar resposta: " + e.getMessage());
        }
    }

    private String extrairErro(String raw) {
        try {
            JsonObject obj = JsonParser.parseString(raw).getAsJsonObject();
            if (obj.has("error") && !obj.get("error").isJsonNull()) {
                return obj.get("error").getAsString();
            }
            if (obj.has("message") && !obj.get("message").isJsonNull()) {
                return obj.get("message").getAsString();
            }
        } catch (Exception ignored) {
        }
        return raw == null || raw.isEmpty() ? "Erro na API" : raw;
    }

    private void aplicarAuth(Request.Builder builder) {
        String token = prefsStore.getToken();
        if (token != null && !token.isEmpty()) {
            builder.header("Authorization", "Bearer " + token);
        }
    }

    private void aplicarEmpresa(Request.Builder builder) {
        String empresaId = prefsStore.getEmpresaId();
        if (empresaId != null && !empresaId.isEmpty()) {
            builder.header("x-empresa-id", empresaId);
        }
    }

    private static String texto(JsonObject obj, String key) {
        if (obj == null || !obj.has(key) || obj.get(key).isJsonNull()) {
            return null;
        }
        JsonElement el = obj.get(key);
        if (el.isJsonPrimitive()) {
            return el.getAsString();
        }
        return el.toString();
    }

    private static String encode(String value) {
        try {
            return java.net.URLEncoder.encode(value, "UTF-8");
        } catch (Exception e) {
            return value;
        }
    }
}

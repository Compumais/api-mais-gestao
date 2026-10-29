package com.pos_mais_gestao.data.api;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import com.google.gson.JsonObject;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.Test;

public class LocalPdvApiTest {
    @Test
    public void loginAberturaEItemUsamSomenteLanComBearerEstavel() throws Exception {
        try (MockWebServer server = new MockWebServer()) {
            server.enqueue(json(200, "{\"token\":\"token-pos\"}"));
            server.enqueue(json(200, "{\"id\":\"conta-1\"}"));
            server.enqueue(json(200, "{\"id\":\"conta-1\",\"itens\":[{\"id\":\"item-1\"}]}"));
            AtomicReference<String> token = new AtomicReference<>();
            LocalPdvApi api = new LocalPdvApi(
                    () -> server.url("/").toString(),
                    token::get,
                    () -> "terminal-android");

            api.login("operador@teste", "senha");
            token.set("token-pos");
            api.abrirMesa(17, null);
            JsonObject item = new JsonObject();
            item.addProperty("idproduto", "produto-1");
            item.addProperty("descricao", "Produto");
            item.addProperty("quantidade", 1);
            item.addProperty("precounitario", 10);
            api.adicionarItem("conta-1", item);

            RecordedRequest login = server.takeRequest(1, TimeUnit.SECONDS);
            RecordedRequest abrir = server.takeRequest(1, TimeUnit.SECONDS);
            RecordedRequest adicionar = server.takeRequest(1, TimeUnit.SECONDS);
            assertEquals("/pos/login", login.getPath());
            assertTrue(login.getBody().readUtf8().contains("\"identificador\":\"terminal-android\""));
            assertEquals("/pos/mesas/17/abrir", abrir.getPath());
            assertEquals("Bearer token-pos", abrir.getHeader("Authorization"));
            assertEquals("/pos/contas/conta-1/itens", adicionar.getPath());
            assertEquals("Bearer token-pos", adicionar.getHeader("Authorization"));
        }
    }

    @Test
    public void naoMascaraResposta401DaLan() throws Exception {
        try (MockWebServer server = new MockWebServer()) {
            server.enqueue(json(401, "{\"error\":\"Não autorizado\"}"));
            LocalPdvApi api = new LocalPdvApi(
                    () -> server.url("/").toString(),
                    () -> "token-expirado",
                    () -> "terminal-android");

            ApiException erro = assertThrows(ApiException.class, api::status);
            assertEquals(401, erro.getStatusCode());
            assertEquals("Não autorizado", erro.getMessage());
        }
    }

    private static MockResponse json(int status, String body) {
        return new MockResponse()
                .setResponseCode(status)
                .addHeader("Content-Type", "application/json")
                .setBody(body);
    }
}

package com.pos_mais_gestao.data.local;

import android.content.Context;
import android.content.SharedPreferences;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.pos_mais_gestao.domain.Produto;
import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

public class PrefsStore {
    private static final String PREFS = "pos_mais_gestao";
    private static final String KEY_BASE_URL = "base_url";
    private static final String KEY_TOKEN = "session_token";
    private static final String KEY_USER_ID = "user_id";
    private static final String KEY_USER_NAME = "user_name";
    private static final String KEY_EMPRESA_ID = "empresa_id";
    private static final String KEY_EMPRESA_NOME = "empresa_nome";
    private static final String KEY_NUMERO_PDV = "numero_pdv";
    private static final String KEY_ATALHOS = "atalhos_json";
    private static final String KEY_EMITIR_NFCE_POS = "emitir_nfce_pos";
    private static final String KEY_QUANTIDADE_MESAS = "quantidade_mesas";
    private static final String KEY_IMPRESSORA_ID = "impressora_id";
    private static final String KEY_IMPRESSORA_NOME = "impressora_nome";
    private static final String KEY_IMPRESSORA_TIPO = "impressora_tipo";
    private static final String KEY_TEMA = "tema";
    private static final String KEY_IMPRIMIR_FICHAS_EVENTO = "imprimir_fichas_evento";
    private static final String KEY_PIX_QR_HABILITADO = "pix_qr_habilitado";
    private static final String KEY_CHAVE_PIX = "chave_pix";
    private static final String KEY_NOME_PIX = "nome_pix";
    private static final String KEY_CIDADE_PIX = "cidade_pix";
    private static final String KEY_CONEXAO_MODO = "conexao_modo";
    private static final String KEY_MODELO_ATENDIMENTO = "modelo_atendimento";
    public static final String MODO_CLOUD = "cloud";
    public static final String MODO_PDV_LOCAL = "pdv_local";
    public static final String MODELO_MESA = "mesa";
    public static final String MODELO_COMANDA = "comanda";
    private static final String DEFAULT_BASE_URL = "http://10.0.2.2:3333";
    private static final String DEFAULT_PDV_URL = "http://10.0.2.2:5050";
    private static final int DEFAULT_QUANTIDADE_MESAS = 20;

    private final SharedPreferences prefs;
    private final Gson gson = new Gson();

    public PrefsStore(Context context) {
        prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public String getBaseUrl() {
        String url = prefs.getString(KEY_BASE_URL, DEFAULT_BASE_URL);
        if (url == null || url.trim().isEmpty()) {
            return DEFAULT_BASE_URL;
        }
        return url.trim().replaceAll("/+$", "");
    }

    public void setBaseUrl(String baseUrl) {
        prefs.edit().putString(KEY_BASE_URL, baseUrl == null ? "" : baseUrl.trim()).apply();
    }

    public String getConexaoModo() {
        String modo = prefs.getString(KEY_CONEXAO_MODO, MODO_CLOUD);
        return MODO_PDV_LOCAL.equals(modo) ? MODO_PDV_LOCAL : MODO_CLOUD;
    }

    public void setConexaoModo(String modo) {
        prefs.edit()
                .putString(KEY_CONEXAO_MODO, MODO_PDV_LOCAL.equals(modo) ? MODO_PDV_LOCAL : MODO_CLOUD)
                .apply();
    }

    public boolean isModoPdvLocal() {
        return MODO_PDV_LOCAL.equals(getConexaoModo());
    }

    public String getModeloAtendimento() {
        String modelo = prefs.getString(KEY_MODELO_ATENDIMENTO, MODELO_MESA);
        return MODELO_COMANDA.equals(modelo) ? MODELO_COMANDA : MODELO_MESA;
    }

    public void setModeloAtendimento(String modelo) {
        prefs.edit()
                .putString(KEY_MODELO_ATENDIMENTO, MODELO_COMANDA.equals(modelo) ? MODELO_COMANDA : MODELO_MESA)
                .apply();
    }

    public boolean isModeloComanda() {
        return isModoPdvLocal() && MODELO_COMANDA.equals(getModeloAtendimento());
    }

    public String getUrlPadraoCloud() {
        return DEFAULT_BASE_URL;
    }

    public String getUrlPadraoPdv() {
        return DEFAULT_PDV_URL;
    }

    public String getToken() {
        return prefs.getString(KEY_TOKEN, null);
    }

    public void setToken(String token) {
        prefs.edit().putString(KEY_TOKEN, token).apply();
    }

    public void setUser(String id, String name) {
        prefs.edit().putString(KEY_USER_ID, id).putString(KEY_USER_NAME, name).apply();
    }

    public String getUserId() {
        return prefs.getString(KEY_USER_ID, null);
    }

    public String getUserName() {
        return prefs.getString(KEY_USER_NAME, null);
    }

    public void setEmpresa(String id, String nome) {
        prefs.edit().putString(KEY_EMPRESA_ID, id).putString(KEY_EMPRESA_NOME, nome).apply();
    }

    /** Remove só a empresa selecionada; mantém token/usuário para trocar de empresa. */
    public void clearEmpresa() {
        prefs.edit()
                .remove(KEY_EMPRESA_ID)
                .remove(KEY_EMPRESA_NOME)
                .putString(KEY_ATALHOS, "[]")
                .apply();
    }

    public String getEmpresaId() {
        return prefs.getString(KEY_EMPRESA_ID, null);
    }

    public String getEmpresaNome() {
        return prefs.getString(KEY_EMPRESA_NOME, null);
    }

    public int getNumeroPdv() {
        return prefs.getInt(KEY_NUMERO_PDV, 1);
    }

    public void setNumeroPdv(int numero) {
        prefs.edit().putInt(KEY_NUMERO_PDV, Math.max(1, numero)).apply();
    }

    public boolean isEmitirNfcePos() {
        return prefs.getBoolean(KEY_EMITIR_NFCE_POS, true);
    }

    public void setEmitirNfcePos(boolean emitir) {
        prefs.edit().putBoolean(KEY_EMITIR_NFCE_POS, emitir).apply();
    }

    public int getQuantidadeMesas() {
        return prefs.getInt(KEY_QUANTIDADE_MESAS, DEFAULT_QUANTIDADE_MESAS);
    }

    public void setQuantidadeMesas(int quantidade) {
        prefs.edit().putInt(KEY_QUANTIDADE_MESAS, Math.max(1, Math.min(500, quantidade))).apply();
    }

    public String getImpressoraId() {
        return prefs.getString(KEY_IMPRESSORA_ID, "");
    }

    public String getImpressoraNome() {
        return prefs.getString(KEY_IMPRESSORA_NOME, null);
    }

    public String getImpressoraTipo() {
        return prefs.getString(KEY_IMPRESSORA_TIPO, "nenhuma");
    }

    public void setImpressora(String id, String nome, String tipo) {
        prefs.edit()
                .putString(KEY_IMPRESSORA_ID, id == null ? "" : id)
                .putString(KEY_IMPRESSORA_NOME, nome)
                .putString(KEY_IMPRESSORA_TIPO, tipo == null ? "nenhuma" : tipo)
                .apply();
    }

    public String getTema() {
        return prefs.getString(KEY_TEMA, "light");
    }

    public void setTema(String tema) {
        prefs.edit().putString(KEY_TEMA, tema == null ? "light" : tema).apply();
    }

    public boolean isImprimirFichasEvento() {
        return prefs.getBoolean(KEY_IMPRIMIR_FICHAS_EVENTO, false);
    }

    public void setImprimirFichasEvento(boolean imprimir) {
        prefs.edit().putBoolean(KEY_IMPRIMIR_FICHAS_EVENTO, imprimir).apply();
    }

    public boolean isPixQrHabilitado() {
        return prefs.getBoolean(KEY_PIX_QR_HABILITADO, false);
    }

    public void setPixQrHabilitado(boolean habilitado) {
        prefs.edit().putBoolean(KEY_PIX_QR_HABILITADO, habilitado).apply();
    }

    public String getChavePix() {
        return prefs.getString(KEY_CHAVE_PIX, "");
    }

    public void setChavePix(String chave) {
        prefs.edit().putString(KEY_CHAVE_PIX, chave == null ? "" : chave.trim()).apply();
    }

    public String getNomePix() {
        return prefs.getString(KEY_NOME_PIX, "");
    }

    public void setNomePix(String nome) {
        prefs.edit().putString(KEY_NOME_PIX, nome == null ? "" : nome.trim()).apply();
    }

    public String getCidadePix() {
        return prefs.getString(KEY_CIDADE_PIX, "");
    }

    public void setCidadePix(String cidade) {
        prefs.edit().putString(KEY_CIDADE_PIX, cidade == null ? "" : cidade.trim()).apply();
    }

    public boolean isLoggedIn() {
        String token = getToken();
        return token != null && !token.isEmpty();
    }

    public boolean hasEmpresa() {
        String id = getEmpresaId();
        return id != null && !id.isEmpty();
    }

    public void logout() {
        prefs.edit()
                .remove(KEY_TOKEN)
                .remove(KEY_USER_ID)
                .remove(KEY_USER_NAME)
                .remove(KEY_EMPRESA_ID)
                .remove(KEY_EMPRESA_NOME)
                .apply();
    }

    public List<Produto> getAtalhos() {
        String json = prefs.getString(KEY_ATALHOS, "[]");
        Type type = new TypeToken<List<AtalhoDto>>() {}.getType();
        List<AtalhoDto> lista = gson.fromJson(json, type);
        List<Produto> produtos = new ArrayList<>();
        if (lista != null) {
            for (AtalhoDto dto : lista) {
                if (dto != null && dto.id != null) {
                    produtos.add(dto.toProduto());
                }
            }
        }
        return produtos;
    }

    public void setAtalhos(List<Produto> atalhos) {
        List<AtalhoDto> dtos = new ArrayList<>();
        for (Produto produto : atalhos) {
            dtos.add(AtalhoDto.from(produto));
        }
        prefs.edit().putString(KEY_ATALHOS, gson.toJson(dtos)).apply();
    }

    public void adicionarAtalho(Produto produto) {
        List<Produto> atalhos = getAtalhos();
        for (Produto p : atalhos) {
            if (p.getId().equals(produto.getId())) {
                return;
            }
        }
        atalhos.add(produto);
        setAtalhos(atalhos);
    }

    public void removerAtalho(String idProduto) {
        List<Produto> atalhos = getAtalhos();
        Iterator<Produto> it = atalhos.iterator();
        while (it.hasNext()) {
            if (it.next().getId().equals(idProduto)) {
                it.remove();
            }
        }
        setAtalhos(atalhos);
    }
}

package com.pos_mais_gestao.data.sync;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.util.Log;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.local.OutboxDb;
import com.pos_mais_gestao.domain.ItemCarrinho;
import com.pos_mais_gestao.domain.MeioPagamento;
import com.pos_mais_gestao.domain.Produto;
import java.lang.reflect.Type;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class OutboxSync {
    private static final String TAG = "OutboxSync";

    private final Context context;
    private final ApiClient api;
    private final OutboxDb db;
    private final Gson gson = new Gson();

    public OutboxSync(Context context, ApiClient api) {
        this.context = context.getApplicationContext();
        this.api = api;
        this.db = new OutboxDb(this.context);
    }

    public OutboxDb getDb() {
        return db;
    }

    public boolean temRede() {
        ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) {
            return false;
        }
        NetworkCapabilities caps = cm.getNetworkCapabilities(cm.getActiveNetwork());
        return caps != null && (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
                || caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)
                || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET));
    }

    public void processarPendentes() {
        if (!temRede()) {
            return;
        }
        for (OutboxDb.OutboxItem item : db.listarPendentes()) {
            try {
                if (OutboxDb.TIPO_ATALHOS.equals(item.tipo)) {
                    Type type = new TypeToken<List<String>>() {}.getType();
                    List<String> ids = gson.fromJson(item.payload, type);
                    api.sincronizarAtalhos(ids != null ? ids : new ArrayList<>());
                } else if (OutboxDb.TIPO_VENDA.equals(item.tipo)) {
                    JsonObject obj = gson.fromJson(item.payload, JsonObject.class);
                    MeioPagamento meio = MeioPagamento.valueOf(obj.get("meio").getAsString());
                    Type type = new TypeToken<List<ItemCarrinhoPayload>>() {}.getType();
                    List<ItemCarrinhoPayload> payloads = gson.fromJson(obj.get("itens"), type);
                    List<ItemCarrinho> itens = new ArrayList<>();
                    if (payloads != null) {
                        for (ItemCarrinhoPayload p : payloads) {
                            Produto produto = new Produto(
                                    p.idproduto,
                                    p.descricao,
                                    new BigDecimal(p.preco),
                                    p.unidademedida,
                                    p.idunidademedida,
                                    null);
                            itens.add(new ItemCarrinho(produto, new BigDecimal(p.quantidade)));
                        }
                    }
                    api.criarVendaPdvRapida(itens, meio);
                }
                db.marcarConcluido(item.id);
            } catch (Exception e) {
                Log.w(TAG, "Falha ao sync outbox " + item.id, e);
                db.incrementarTentativa(item.id);
            }
        }
    }

    public void enfileirarAtalhos(List<String> ids) {
        db.enfileirar(OutboxDb.TIPO_ATALHOS, gson.toJson(ids));
    }

    public void enfileirarVenda(List<ItemCarrinho> itens, MeioPagamento meio) {
        JsonObject obj = new JsonObject();
        obj.addProperty("meio", meio.name());
        JsonArray arr = new JsonArray();
        for (ItemCarrinho item : itens) {
            JsonObject i = new JsonObject();
            i.addProperty("idproduto", item.getProduto().getId());
            i.addProperty("descricao", item.getProduto().getDescricao());
            i.addProperty("preco", item.getProduto().getPreco().toPlainString());
            i.addProperty("unidademedida", item.getProduto().getUnidadeMedida());
            i.addProperty("idunidademedida", item.getProduto().getIdUnidadeMedida());
            i.addProperty("quantidade", item.getQuantidade().toPlainString());
            arr.add(i);
        }
        obj.add("itens", arr);
        db.enfileirar(OutboxDb.TIPO_VENDA, obj.toString());
    }

    private static class ItemCarrinhoPayload {
        String idproduto;
        String descricao;
        String preco;
        String unidademedida;
        String idunidademedida;
        String quantidade;
    }
}

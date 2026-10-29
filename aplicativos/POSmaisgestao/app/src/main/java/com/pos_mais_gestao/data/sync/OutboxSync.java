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
import com.pos_mais_gestao.domain.LancamentoPagamento;
import com.pos_mais_gestao.domain.MeioPagamento;
import com.pos_mais_gestao.domain.Produto;
import com.pos_mais_gestao.util.PagamentosMisto;
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
                    List<LancamentoPagamento> pags = lerLancamentosOutbox(obj, itens);
                    BigDecimal troco = BigDecimal.ZERO;
                    if (obj.has("troco") && !obj.get("troco").isJsonNull()) {
                        troco = new BigDecimal(obj.get("troco").getAsString());
                    }
                    api.criarVendaPdvRapida(itens, pags, troco, null, null, null);
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
        BigDecimal total = BigDecimal.ZERO;
        for (ItemCarrinho item : itens) {
            total = total.add(item.getSubtotal());
        }
        List<LancamentoPagamento> pags = new ArrayList<>();
        pags.add(LancamentoPagamento.ok(meio, total));
        enfileirarVenda(itens, pags, BigDecimal.ZERO);
    }

    public void enfileirarVenda(
            List<ItemCarrinho> itens, List<LancamentoPagamento> lancamentos, BigDecimal troco) {
        JsonObject obj = new JsonObject();
        if (lancamentos != null && !lancamentos.isEmpty()) {
            obj.addProperty("meio", PagamentosMisto.meioPrincipal(lancamentos).name());
            obj.add("pagamentos", PagamentosMisto.toJsonArray(lancamentos));
        }
        if (troco != null && troco.compareTo(BigDecimal.ZERO) > 0) {
            obj.addProperty("troco", troco.toPlainString());
        }
        JsonArray arr = new JsonArray();
        for (ItemCarrinho item : itens) {
            JsonObject i = new JsonObject();
            i.addProperty("idproduto", item.getProdutoFiscal().getId());
            i.addProperty("descricao", item.getDescricaoExibicao());
            i.addProperty("preco", item.getPrecoUnitario().toPlainString());
            i.addProperty("unidademedida", item.getProduto().getUnidadeMedida());
            i.addProperty("idunidademedida", item.getProduto().getIdUnidadeMedida());
            i.addProperty("quantidade", item.getQuantidade().toPlainString());
            arr.add(i);
        }
        obj.add("itens", arr);
        db.enfileirar(OutboxDb.TIPO_VENDA, obj.toString());
    }

    private static List<LancamentoPagamento> lerLancamentosOutbox(
            JsonObject obj, List<ItemCarrinho> itens) {
        List<LancamentoPagamento> pags = new ArrayList<>();
        if (obj.has("pagamentos") && obj.get("pagamentos").isJsonArray()) {
            for (com.google.gson.JsonElement el : obj.getAsJsonArray("pagamentos")) {
                if (!el.isJsonObject()) {
                    continue;
                }
                JsonObject p = el.getAsJsonObject();
                try {
                    MeioPagamento meio = MeioPagamento.valueOf(p.get("meio").getAsString());
                    BigDecimal valor = new BigDecimal(p.get("valor").getAsString());
                    LancamentoPagamento item = LancamentoPagamento.ok(meio, valor);
                    if (p.has("status") && !p.get("status").isJsonNull()) {
                        item.status = p.get("status").getAsString();
                    }
                    if (p.has("nsu") && !p.get("nsu").isJsonNull()) {
                        item.nsu = p.get("nsu").getAsString();
                    }
                    if (p.has("autorizacao") && !p.get("autorizacao").isJsonNull()) {
                        item.autorizacao = p.get("autorizacao").getAsString();
                    }
                    if (p.has("bandeira") && !p.get("bandeira").isJsonNull()) {
                        item.bandeira = p.get("bandeira").getAsString();
                    }
                    pags.add(item);
                } catch (Exception ignored) {
                    // ignora lançamento inválido do payload antigo
                }
            }
        }
        if (!pags.isEmpty()) {
            return pags;
        }
        MeioPagamento meio = MeioPagamento.DINHEIRO;
        if (obj.has("meio") && !obj.get("meio").isJsonNull()) {
            meio = MeioPagamento.valueOf(obj.get("meio").getAsString());
        }
        BigDecimal total = BigDecimal.ZERO;
        for (ItemCarrinho item : itens) {
            total = total.add(item.getSubtotal());
        }
        pags.add(LancamentoPagamento.ok(meio, total));
        return pags;
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

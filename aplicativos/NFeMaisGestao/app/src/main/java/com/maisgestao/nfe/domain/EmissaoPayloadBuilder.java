package com.maisgestao.nfe.domain;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

public final class EmissaoPayloadBuilder {
    private EmissaoPayloadBuilder() {}

    public static JsonObject build(EmissaoFormStore store, boolean confirmarProducao) {
        JsonObject payload = store.getDados().deepCopy();
        payload.addProperty("confirmarProducao", confirmarProducao);

        double totalNota = 0;
        JsonObject totaisFiscais = store.getTotaisFiscais();
        if (totaisFiscais != null && totaisFiscais.has("totalNota")) {
            totalNota = totaisFiscais.get("totalNota").getAsDouble();
        } else {
            totalNota = somarItens(payload.getAsJsonArray("itens"));
        }

        String tPag = store.getFormaPagamentoCodigo();
        JsonObject pagamento = montarPagamento(tPag, totalNota);
        payload.add("pagamento", pagamento);

        JsonObject dados = store.getDados();
        if (dados.has("idplanocontas") && !dados.get("idplanocontas").isJsonNull()) {
            payload.add("idplanocontas", dados.get("idplanocontas"));
        }
        if (dados.has("idcondicaopagto") && !dados.get("idcondicaopagto").isJsonNull()) {
            payload.add("idcondicaopagto", dados.get("idcondicaopagto"));
        }
        if (dados.has("idtipodocumento") && !dados.get("idtipodocumento").isJsonNull()) {
            payload.add("idtipodocumento", dados.get("idtipodocumento"));
        }
        return payload;
    }

    private static double somarItens(JsonArray itens) {
        if (itens == null) {
            return 0;
        }
        double total = 0;
        for (int i = 0; i < itens.size(); i++) {
            JsonObject item = itens.get(i).getAsJsonObject();
            double qtd = item.has("quantidade") ? item.get("quantidade").getAsDouble() : 0;
            double unit = item.has("valorUnitario") ? item.get("valorUnitario").getAsDouble() : 0;
            total += qtd * unit;
        }
        return total;
    }

    private static JsonObject montarPagamento(String tPag, double totalNota) {
        String forma = "90".equals(tPag) ? "90" : (tPag == null || tPag.isEmpty() ? "01" : tPag);
        JsonObject pagamento = new JsonObject();
        JsonArray formas = new JsonArray();
        JsonObject linha = new JsonObject();
        linha.addProperty("tPag", forma);
        if ("90".equals(forma)) {
            linha.addProperty("vPag", 0);
        } else {
            double valor = totalNota > 0 ? totalNota : 0.01;
            linha.addProperty("vPag", valor);
        }
        formas.add(linha);
        pagamento.add("formas", formas);
        return pagamento;
    }
}

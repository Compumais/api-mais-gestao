package com.maisgestao.nfe.domain;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import java.util.regex.Pattern;

/** Monta o corpo de POST /nfe/emissao a partir de um rascunho já gravado. */
public final class RascunhoEmissaoPayload {
    public static final int STATUS_RASCUNHO = 99;
    private static final Pattern UUID = Pattern.compile(
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");

    private RascunhoEmissaoPayload() {}

    public static boolean ehRascunho(JsonObject nota) {
        Integer status = inteiro(nota, "status");
        return status != null && status == STATUS_RASCUNHO;
    }

    public static JsonObject montar(JsonObject nota, JsonArray itensDb, boolean confirmarProducao) {
        if (nota == null) {
            throw new IllegalArgumentException("Não foi possível ler o rascunho.");
        }
        JsonObject emissao = emissaoSalva(nota);
        JsonObject payload = new JsonObject();
        String idempresa = texto(nota, "idempresa");
        if (!uuid(idempresa)) {
            throw new IllegalArgumentException("O rascunho está sem empresa.");
        }
        payload.addProperty("idempresa", idempresa);
        String idNota = texto(nota, "id");
        if (!uuid(idNota)) {
            throw new IllegalArgumentException("Não foi possível identificar o rascunho.");
        }
        payload.addProperty("idnotafiscal", idNota);
        payload.addProperty("confirmarProducao", confirmarProducao);

        copiarUuid(nota, payload, "identidade", "iddestinatario");
        String serie = texto(nota, "idserie");
        if (!uuid(serie)) {
            serie = texto(emissao, "idserienfe");
        }
        if (uuid(serie)) {
            payload.addProperty("idserienfe", serie);
        }
        copiarUuid(nota, payload, "idplanocontas", "idplanocontas");
        copiarUuid(nota, payload, "idcondicaopagto", "idcondicaopagto");
        copiarUuid(nota, payload, "idtipodocumento", "idtipodocumento");

        String natOp = EmissaoPayloadBuilder.natOp(texto(emissao, "natOp"));
        if (!natOp.isEmpty()) {
            payload.addProperty("natOp", natOp);
        }
        Integer indPres = inteiro(emissao, "indPres");
        if (indPres != null) {
            payload.addProperty("indPres", indPres);
        }
        Integer idDest = inteiro(emissao, "idDest");
        if (idDest != null) {
            payload.addProperty("idDest", idDest);
        }
        if (emissao != null && emissao.has("gerarFinanceiro") && emissao.get("gerarFinanceiro").isJsonPrimitive()) {
            payload.addProperty("gerarFinanceiro", emissao.get("gerarFinanceiro").getAsBoolean());
        }
        if (emissao != null && emissao.has("gerarEstoque") && emissao.get("gerarEstoque").isJsonPrimitive()) {
            payload.addProperty("gerarEstoque", emissao.get("gerarEstoque").getAsBoolean());
        }

        JsonObject totais = new JsonObject();
        copiarNumero(totais, "frete", nota, "frete");
        copiarNumero(totais, "seguro", nota, "seguro");
        copiarNumero(totais, "desconto", nota, "descontosubtotal");
        copiarNumero(totais, "outrasDespesas", nota, "outrasdespesas");
        if (emissao != null && emissao.has("totais") && emissao.get("totais").isJsonObject()) {
            JsonObject salvos = emissao.getAsJsonObject("totais");
            copiarNumero(totais, "frete", salvos, "frete");
            copiarNumero(totais, "seguro", salvos, "seguro");
            copiarNumero(totais, "desconto", salvos, "desconto");
            copiarNumero(totais, "outrasDespesas", salvos, "outrasDespesas");
        }
        if (totais.size() > 0) {
            payload.add("totais", totais);
        }

        Integer modFrete = inteiro(nota, "tipofrete");
        if (modFrete == null && emissao != null && emissao.has("transporte") && emissao.get("transporte").isJsonObject()) {
            modFrete = inteiro(emissao.getAsJsonObject("transporte"), "modFrete");
        }
        JsonObject transporte = new JsonObject();
        transporte.addProperty("modFrete", modFrete == null ? 9 : modFrete);
        payload.add("transporte", transporte);

        JsonArray bruto = new JsonArray();
        if (itensDb != null) {
            for (JsonElement elemento : itensDb) {
                if (elemento.isJsonObject()) {
                    bruto.add(item(elemento.getAsJsonObject()));
                }
            }
        }
        payload.add("itens", EmissaoPayloadBuilder.prepararItens(bruto));

        if (emissao != null && emissao.has("pagamento") && emissao.get("pagamento").isJsonObject()) {
            payload.add("pagamento", emissao.get("pagamento"));
        } else {
            double total = numero(nota.get("valortotalnota"));
            payload.add("pagamento", pagamento(texto(emissao, "formaPagamento"), total));
        }
        if (emissao != null && emissao.has("formasPagamento") && emissao.get("formasPagamento").isJsonArray()) {
            payload.add("formasPagamento", emissao.get("formasPagamento"));
        }
        return payload;
    }

    private static JsonObject item(JsonObject origem) {
        JsonObject item = new JsonObject();
        String descricao = texto(origem, "descricao");
        item.addProperty("descricao", descricao == null ? "Produto" : descricao);
        item.addProperty("ncm", digitos(texto(origem, "ncm")));
        item.addProperty("cfop", EmissaoPayloadBuilder.cfopCodigo(texto(origem, "cfop")));
        item.addProperty("unidade", EmissaoPayloadBuilder.unidadeCodigo(texto(origem, "unidade")));
        Double quantidade = numeroOuNulo(origem.get("quantidade"));
        Double valor = numeroOuNulo(origem.get("precounitario"));
        if (valor == null) {
            valor = numeroOuNulo(origem.get("valorUnitario"));
        }
        item.addProperty("quantidade", quantidade == null ? 0 : quantidade);
        item.addProperty("valorUnitario", valor == null ? 0 : valor);
        String produto = texto(origem, "idproduto");
        if (uuid(produto)) {
            item.addProperty("idproduto", produto);
        }
        String situacao = texto(origem, "situacaotributaria");
        if (situacao != null) {
            if (situacao.length() == 3) {
                item.addProperty("csosn", situacao);
            } else {
                item.addProperty("cst", situacao);
            }
        }
        Integer orig = inteiro(origem, "origem");
        if (orig == null) {
            orig = inteiro(origem, "orig");
        }
        item.addProperty("orig", orig == null ? 0 : orig);
        copiarTexto(origem, item, "cstpis", "cstPis");
        copiarTexto(origem, item, "cstcofins", "cstCofins");
        return item;
    }

    private static JsonObject pagamento(String tPag, double total) {
        String forma = tPag == null || tPag.trim().isEmpty() ? "01" : tPag.trim();
        JsonObject pagamento = new JsonObject();
        JsonArray formas = new JsonArray();
        JsonObject linha = new JsonObject();
        linha.addProperty("tPag", forma);
        linha.addProperty("vPag", "90".equals(forma) ? 0 : (total > 0 ? total : 0.01));
        formas.add(linha);
        pagamento.add("formas", formas);
        return pagamento;
    }

    private static JsonObject emissaoSalva(JsonObject nota) {
        if (nota == null || !nota.has("dadosimportacao") || !nota.get("dadosimportacao").isJsonObject()) {
            return null;
        }
        JsonObject dados = nota.getAsJsonObject("dadosimportacao");
        if (!dados.has("emissao") || !dados.get("emissao").isJsonObject()) {
            return null;
        }
        return dados.getAsJsonObject("emissao");
    }

    private static void copiarUuid(JsonObject origem, JsonObject destino, String campoOrigem, String campoDestino) {
        String valor = texto(origem, campoOrigem);
        if (uuid(valor)) {
            destino.addProperty(campoDestino, valor);
        }
    }

    private static void copiarTexto(JsonObject origem, JsonObject destino, String campoOrigem, String campoDestino) {
        String valor = texto(origem, campoOrigem);
        if (valor != null) {
            destino.addProperty(campoDestino, valor);
        }
    }

    private static void copiarNumero(JsonObject destino, String campoDestino, JsonObject origem, String campoOrigem) {
        if (origem == null || !origem.has(campoOrigem)) {
            return;
        }
        Double valor = numeroOuNulo(origem.get(campoOrigem));
        if (valor != null) {
            destino.addProperty(campoDestino, valor);
        }
    }

    private static String texto(JsonObject objeto, String campo) {
        if (objeto == null || !objeto.has(campo) || objeto.get(campo).isJsonNull()) {
            return null;
        }
        JsonElement elemento = objeto.get(campo);
        if (!elemento.isJsonPrimitive()) {
            return null;
        }
        String valor = elemento.getAsString().trim();
        return valor.isEmpty() ? null : valor;
    }

    private static Integer inteiro(JsonObject objeto, String campo) {
        Double valor = objeto == null ? null : numeroOuNulo(objeto.get(campo));
        return valor == null ? null : valor.intValue();
    }

    private static double numero(JsonElement elemento) {
        Double valor = numeroOuNulo(elemento);
        return valor == null ? 0 : valor;
    }

    private static Double numeroOuNulo(JsonElement elemento) {
        if (elemento == null || elemento.isJsonNull() || !elemento.isJsonPrimitive()) {
            return null;
        }
        try {
            if (elemento.getAsJsonPrimitive().isNumber()) {
                return elemento.getAsDouble();
            }
            if (elemento.getAsJsonPrimitive().isString()) {
                String bruto = elemento.getAsString().trim().replace(",", ".");
                if (bruto.isEmpty()) {
                    return null;
                }
                return Double.parseDouble(bruto);
            }
        } catch (Exception ignored) {
            return null;
        }
        return null;
    }

    private static String digitos(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }

    private static boolean uuid(String valor) {
        return valor != null && UUID.matcher(valor).matches();
    }
}

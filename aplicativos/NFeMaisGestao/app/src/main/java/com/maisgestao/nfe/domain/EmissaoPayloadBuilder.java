package com.maisgestao.nfe.domain;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

public final class EmissaoPayloadBuilder {
    private static final Pattern UUID = Pattern.compile(
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");
    private static final Set<String> UUIDS_OPCIONAIS = new HashSet<>(Arrays.asList(
            "idnotafiscal",
            "iddestinatario",
            "idserienfe",
            "idplanocontas",
            "idcondicaopagto",
            "idlocalestoque",
            "idtipodocumento",
            "iddav"));
    private static final String[] TOTAIS = {"frete", "seguro", "desconto", "outrasDespesas"};
    private static final String[] NUMEROS_ITEM = {
            "desconto",
            "aliquotaPis",
            "aliquotaCofins",
            "baseIcms",
            "aliquotaIcms",
            "aliquotaIcmsProprioSt",
            "pCredSN",
            "vCredICMSSN",
            "valorIcms",
            "valorIpi",
            "valorIpiDevol",
            "baseIcmsSt",
            "valorIcmsSt",
            "percentualMvaSt",
            "aliquotaIcmsSt",
            "aliquotaFcpSt",
            "valorFcpSt",
            "valorFcpStRet",
            "valorIcmsDesonerado",
            "valorIcmsMonoRet",
            "valorIcmsMonoReten"
    };

    private EmissaoPayloadBuilder() {}

    public static JsonObject build(EmissaoFormStore store, boolean confirmarProducao) {
        JsonObject payload = store.getDados().deepCopy();
        payload.add("itens", prepararItens(payload.getAsJsonArray("itens")));
        payload.addProperty("confirmarProducao", confirmarProducao);
        ajustarNatOp(payload);
        ajustarUuidsOpcionais(payload);
        if (!uuidValido(texto(payload, "idempresa"))) {
            throw new IllegalArgumentException("Selecione a empresa antes de emitir a nota.");
        }
        sanitizarTotais(payload);
        sanitizarTransporte(payload);
        removerNulos(payload);

        double totalNota = 0;
        JsonObject totaisFiscais = store.getTotaisFiscais();
        if (totaisFiscais != null && totaisFiscais.has("totalNota") && !totaisFiscais.get("totalNota").isJsonNull()) {
            Double fiscal = numero(totaisFiscais.get("totalNota"));
            totalNota = fiscal == null ? 0 : fiscal;
        }
        if (totalNota <= 0) {
            totalNota = somarItens(payload.getAsJsonArray("itens"));
        }
        payload.add("pagamento", montarPagamento(store.getFormaPagamentoCodigo(), totalNota));
        return payload;
    }

    public static JsonArray prepararItens(JsonArray origem) {
        if (origem == null || origem.size() == 0) {
            throw new IllegalArgumentException("Inclua ao menos um produto na nota.");
        }
        JsonArray itens = new JsonArray();
        for (int i = 0; i < origem.size(); i++) {
            if (!origem.get(i).isJsonObject()) {
                throw new IllegalArgumentException("Item " + (i + 1) + " está inválido.");
            }
            itens.add(sanitizarItem(origem.get(i).getAsJsonObject(), i + 1));
        }
        return itens;
    }

    public static String cfopCodigo(String valor) {
        String digitos = digitos(valor);
        if (digitos.length() >= 4 && digitos.length() <= 5) {
            return digitos;
        }
        if (digitos.length() > 5) {
            return digitos.substring(0, 4);
        }
        return "5102";
    }

    public static String unidadeCodigo(String valor) {
        if (valor == null) {
            return "UN";
        }
        String texto = valor.trim().toUpperCase(Locale.ROOT);
        if (texto.isEmpty()) {
            return "UN";
        }
        switch (texto) {
            case "UNIDADE":
            case "UNIDADES":
            case "UNID":
            case "UND":
                return "UN";
            case "QUILOGRAMA":
            case "QUILOGRAMAS":
            case "QUILO":
            case "KILO":
                return "KG";
            case "GRAMA":
            case "GRAMAS":
                return "G";
            case "LITRO":
            case "LITROS":
                return "LT";
            case "METRO":
            case "METROS":
                return "MT";
            case "CAIXA":
            case "CAIXAS":
                return "CX";
            case "PACOTE":
            case "PACOTES":
                return "PCT";
            case "PECA":
            case "PECAS":
                return "PC";
            default:
                return texto.length() > 6 ? texto.substring(0, 6) : texto;
        }
    }

    public static String natOp(String valor) {
        if (valor == null) {
            return "";
        }
        String texto = valor.trim().replaceAll("\\s+", " ");
        if (texto.length() > 60) {
            return texto.substring(0, 60).trim();
        }
        return texto;
    }

    private static JsonObject sanitizarItem(JsonObject origem, int numeroItem) {
        JsonObject item = new JsonObject();
        String descricao = texto(origem, "descricao");
        if (descricao == null || descricao.isEmpty()) {
            descricao = "Produto";
        }
        item.addProperty("descricao", descricao);

        String ncm = digitos(texto(origem, "ncm"));
        if (ncm.isEmpty()) {
            throw new IllegalArgumentException(
                    "Item " + numeroItem + " (" + descricao + ") está sem NCM. Preencha o NCM no cadastro do produto.");
        }
        item.addProperty("ncm", ncm);
        item.addProperty("cfop", cfopCodigo(texto(origem, "cfop")));
        item.addProperty("unidade", unidadeCodigo(texto(origem, "unidade")));

        Double quantidade = numero(origem.get("quantidade"));
        Double valorUnitario = numero(origem.get("valorUnitario"));
        if (quantidade == null || quantidade <= 0 || valorUnitario == null || valorUnitario <= 0) {
            throw new IllegalArgumentException(
                    "Item " + numeroItem + " (" + descricao + "): informe quantidade e valor unitário maiores que zero.");
        }
        item.addProperty("quantidade", quantidade);
        item.addProperty("valorUnitario", valorUnitario);

        String idproduto = texto(origem, "idproduto");
        if (uuidValido(idproduto)) {
            item.addProperty("idproduto", idproduto);
        }
        copiarTexto(origem, item, "codigoProduto");
        copiarTexto(origem, item, "ean");
        copiarTexto(origem, item, "eanTributavel");
        copiarTexto(origem, item, "cst");
        copiarTexto(origem, item, "csosn");
        copiarTexto(origem, item, "cstPis");
        copiarTexto(origem, item, "cstCofins");

        String cest = digitos(texto(origem, "cest"));
        if (cest.length() == 7) {
            item.addProperty("cest", cest);
        }

        Double orig = numero(origem.get("orig"));
        item.addProperty("orig", orig == null ? 0 : orig);

        for (String campo : NUMEROS_ITEM) {
            Double valor = numero(origem.get(campo));
            if (valor != null && !valor.isNaN() && !valor.isInfinite()) {
                item.addProperty(campo, valor);
            }
        }
        copiarIbsCbs(origem, item);
        copiarRastros(origem, item);
        return item;
    }

    private static void copiarIbsCbs(JsonObject origem, JsonObject item) {
        if (!origem.has("ibsCbs") || !origem.get("ibsCbs").isJsonObject()) {
            return;
        }
        JsonObject bruto = origem.getAsJsonObject("ibsCbs");
        String cst = texto(bruto, "cst");
        String classe = texto(bruto, "cClassTrib");
        if (cst == null || classe == null || cst.length() < 1 || cst.length() > 3 || classe.length() < 1 || classe.length() > 6) {
            return;
        }
        JsonObject ibs = new JsonObject();
        ibs.addProperty("cst", cst);
        ibs.addProperty("cClassTrib", classe);
        Double aliquotaIbs = numero(bruto.get("aliquotaIbs"));
        Double aliquotaCbs = numero(bruto.get("aliquotaCbs"));
        if (aliquotaIbs != null && aliquotaIbs >= 0) {
            ibs.addProperty("aliquotaIbs", aliquotaIbs);
        }
        if (aliquotaCbs != null && aliquotaCbs >= 0) {
            ibs.addProperty("aliquotaCbs", aliquotaCbs);
        }
        item.add("ibsCbs", ibs);
    }

    private static void copiarRastros(JsonObject origem, JsonObject item) {
        if (!origem.has("rastros") || !origem.get("rastros").isJsonArray()) {
            return;
        }
        JsonArray saida = new JsonArray();
        for (JsonElement elemento : origem.getAsJsonArray("rastros")) {
            if (!elemento.isJsonObject()) {
                continue;
            }
            JsonObject rastro = elemento.getAsJsonObject();
            String lote = texto(rastro, "nLote");
            Double qtd = numero(rastro.get("qLote"));
            if (lote == null || lote.length() > 20 || qtd == null || qtd <= 0) {
                continue;
            }
            JsonObject limpo = new JsonObject();
            String idlote = texto(rastro, "idlote");
            if (uuidValido(idlote)) {
                limpo.addProperty("idlote", idlote);
            }
            limpo.addProperty("nLote", lote);
            limpo.addProperty("qLote", qtd);
            copiarTexto(rastro, limpo, "dFab");
            copiarTexto(rastro, limpo, "dVal");
            String agreg = texto(rastro, "cAgreg");
            if (agreg != null && agreg.length() <= 20) {
                limpo.addProperty("cAgreg", agreg);
            }
            saida.add(limpo);
        }
        if (saida.size() > 0) {
            item.add("rastros", saida);
        }
    }

    private static void ajustarNatOp(JsonObject payload) {
        String texto = natOp(texto(payload, "natOp"));
        if (texto.isEmpty()) {
            payload.remove("natOp");
        } else {
            payload.addProperty("natOp", texto);
        }
    }

    private static void ajustarUuidsOpcionais(JsonObject payload) {
        for (String campo : UUIDS_OPCIONAIS) {
            if (!payload.has(campo)) {
                continue;
            }
            String valor = texto(payload, campo);
            if (!uuidValido(valor)) {
                payload.remove(campo);
            }
        }
    }

    private static void sanitizarTotais(JsonObject payload) {
        if (!payload.has("totais") || !payload.get("totais").isJsonObject()) {
            payload.remove("totais");
            return;
        }
        JsonObject origem = payload.getAsJsonObject("totais");
        JsonObject totais = new JsonObject();
        for (String campo : TOTAIS) {
            Double valor = numero(origem.get(campo));
            if (valor != null && !valor.isNaN() && !valor.isInfinite()) {
                totais.addProperty(campo, valor);
            }
        }
        if (totais.size() == 0) {
            payload.remove("totais");
        } else {
            payload.add("totais", totais);
        }
    }

    private static void sanitizarTransporte(JsonObject payload) {
        if (!payload.has("transporte") || !payload.get("transporte").isJsonObject()) {
            payload.remove("transporte");
            return;
        }
        Double modFrete = numero(payload.getAsJsonObject("transporte").get("modFrete"));
        if (modFrete == null) {
            payload.remove("transporte");
            return;
        }
        JsonObject transporte = new JsonObject();
        transporte.addProperty("modFrete", modFrete.intValue());
        payload.add("transporte", transporte);
    }

    private static void removerNulos(JsonObject objeto) {
        List<String> chaves = new ArrayList<>(objeto.keySet());
        for (String chave : chaves) {
            if (objeto.get(chave) == null || objeto.get(chave).isJsonNull()) {
                objeto.remove(chave);
            }
        }
    }

    private static void copiarTexto(JsonObject origem, JsonObject destino, String campo) {
        String valor = texto(origem, campo);
        if (valor != null && !valor.isEmpty()) {
            destino.addProperty(campo, valor);
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

    private static Double numero(JsonElement elemento) {
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
        if (valor == null) {
            return "";
        }
        return valor.replaceAll("\\D", "");
    }

    private static boolean uuidValido(String valor) {
        return valor != null && UUID.matcher(valor).matches();
    }

    private static double somarItens(JsonArray itens) {
        if (itens == null) {
            return 0;
        }
        double total = 0;
        for (int i = 0; i < itens.size(); i++) {
            JsonObject item = itens.get(i).getAsJsonObject();
            Double qtd = numero(item.get("quantidade"));
            Double unit = numero(item.get("valorUnitario"));
            total += (qtd == null ? 0 : qtd) * (unit == null ? 0 : unit);
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

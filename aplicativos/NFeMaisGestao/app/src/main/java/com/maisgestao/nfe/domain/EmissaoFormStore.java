package com.maisgestao.nfe.domain;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.maisgestao.nfe.data.api.dto.EntidadeDto;
import com.maisgestao.nfe.data.api.dto.ProdutoDto;

public class EmissaoFormStore {
    private static EmissaoFormStore instance;

    private JsonObject dados = new JsonObject();
    private Integer crt;
    private JsonObject totaisFiscais;
    private String formaPagamentoCodigo = "01";
    private String defaultCfop = "5102";
    private String destinatarioNome;
    private String destinatarioDoc;

    public static synchronized EmissaoFormStore get() {
        if (instance == null) {
            instance = new EmissaoFormStore();
        }
        return instance;
    }

    public void reset(String idempresa, String idnotafiscal) {
        dados = new JsonObject();
        dados.addProperty("idempresa", idempresa);
        dados.addProperty("confirmarProducao", false);
        dados.addProperty("indPres", 1);
        dados.addProperty("gerarFinanceiro", true);
        dados.addProperty("gerarEstoque", true);
        dados.add("itens", new JsonArray());
        JsonObject transporte = new JsonObject();
        transporte.addProperty("modFrete", 9);
        dados.add("transporte", transporte);
        dados.add("totais", new JsonObject());
        if (idnotafiscal != null && !idnotafiscal.isEmpty()) {
            dados.addProperty("idnotafiscal", idnotafiscal);
        }
        crt = null;
        totaisFiscais = null;
        formaPagamentoCodigo = "01";
        defaultCfop = "5102";
        destinatarioNome = null;
        destinatarioDoc = null;
    }

    public JsonObject getDados() {
        return dados;
    }

    public Integer getCrt() {
        return crt;
    }

    public JsonObject getTotaisFiscais() {
        return totaisFiscais;
    }

    public String getFormaPagamentoCodigo() {
        return formaPagamentoCodigo;
    }

    public void setFormaPagamentoCodigo(String codigo) {
        formaPagamentoCodigo = codigo == null ? "01" : codigo;
    }

    public String getDefaultCfop() {
        return defaultCfop;
    }

    public void setDefaultCfop(String cfop) {
        if (cfop != null && !cfop.isEmpty()) {
            defaultCfop = cfop;
        }
    }

    public String getDestinatarioNome() {
        return destinatarioNome;
    }

    public String getDestinatarioDoc() {
        return destinatarioDoc;
    }

    public void setDestinatario(EntidadeDto cliente) {
        if (cliente == null) {
            dados.remove("iddestinatario");
            destinatarioNome = null;
            destinatarioDoc = null;
            return;
        }
        dados.addProperty("iddestinatario", cliente.id);
        destinatarioNome = cliente.nome != null ? cliente.nome : cliente.razaosocial;
        destinatarioDoc = cliente.cnpjcpf;
    }

    public void setCampo(String key, String value) {
        if (value == null) {
            dados.remove(key);
        } else {
            dados.addProperty(key, value);
        }
    }

    public void setCampoInt(String key, int value) {
        dados.addProperty(key, value);
    }

    public void setCampoBool(String key, boolean value) {
        dados.addProperty(key, value);
    }

    public JsonArray getItens() {
        if (!dados.has("itens") || !dados.get("itens").isJsonArray()) {
            JsonArray arr = new JsonArray();
            dados.add("itens", arr);
            return arr;
        }
        return dados.getAsJsonArray("itens");
    }

    public JsonObject getTotais() {
        if (!dados.has("totais") || !dados.get("totais").isJsonObject()) {
            JsonObject totais = new JsonObject();
            dados.add("totais", totais);
            return totais;
        }
        return dados.getAsJsonObject("totais");
    }

    public void setTotaisNumero(String key, double value) {
        getTotais().addProperty(key, value);
        invalidarTributos();
    }

    public void addItemFromProduto(ProdutoDto produto, double quantidade, double valorUnitario) {
        JsonObject item = new JsonObject();
        item.addProperty("idproduto", produto.id);
        if (produto.codigo != null) {
            item.addProperty("codigoProduto", String.valueOf(produto.codigo));
        }
        item.addProperty("descricao", produto.nome);
        item.addProperty("ncm", produto.ncm == null ? "" : produto.ncm);
        item.addProperty("cfop", defaultCfop);
        String unidade = produto.unidademedida == null ? "UN" : produto.unidademedida.trim();
        if (unidade.length() > 6) {
            unidade = unidade.substring(0, 6);
        }
        item.addProperty("unidade", unidade.isEmpty() ? "UN" : unidade);
        double qtd = quantidade > 0 ? quantidade : 1;
        double preco = valorUnitario > 0 ? valorUnitario : 0.01;
        item.addProperty("quantidade", qtd);
        item.addProperty("valorUnitario", preco);
        item.addProperty("orig", produto.origem == null ? 0 : produto.origem);
        if (produto.situacaotributaria != null) {
            item.addProperty("cst", produto.situacaotributaria);
        }
        if (produto.situacaotributariasn != null) {
            item.addProperty("csosn", produto.situacaotributariasn);
        }
        if (produto.cstpis != null) {
            item.addProperty("cstPis", String.valueOf(produto.cstpis));
        }
        if (produto.cstcofins != null) {
            item.addProperty("cstCofins", String.valueOf(produto.cstcofins));
        }
        if (produto.controlalote != null && produto.controlalote == 1) {
            item.addProperty("controlaLote", true);
        }
        getItens().add(item);
        invalidarTributos();
    }

    public void removeItem(int index) {
        JsonArray itens = getItens();
        if (index >= 0 && index < itens.size()) {
            itens.remove(index);
            invalidarTributos();
        }
    }

    public void setTributos(int crtValue, JsonArray itens, JsonObject totais) {
        this.crt = crtValue;
        this.totaisFiscais = totais;
        dados.add("itens", itens);
    }

    public void invalidarTributos() {
        totaisFiscais = null;
    }

    public void setTransporteModFrete(int modFrete) {
        JsonObject transporte = dados.has("transporte") && dados.get("transporte").isJsonObject()
                ? dados.getAsJsonObject("transporte")
                : new JsonObject();
        transporte.addProperty("modFrete", modFrete);
        dados.add("transporte", transporte);
    }
}

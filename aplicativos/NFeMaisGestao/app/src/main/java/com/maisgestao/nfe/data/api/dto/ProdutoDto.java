package com.maisgestao.nfe.data.api.dto;

public class ProdutoDto {
    public String id;
    public String idempresa;
    public Integer codigo;
    public String nome;
    public String preco;
    public String ncm;
    public String unidademedida;
    public Integer origem;
    public Integer inativo;
    public String idunidademedida;
    public String idcfopsaida;
    public String situacaotributaria;
    public String situacaotributariasn;
    public String cstpis;
    public String cstcofins;
    public Object ean;
    public Integer controlalote;

    public String nomeExibicao() {
        if (nome != null && !nome.trim().isEmpty()) {
            return nome.trim();
        }
        return "Produto";
    }

    public String codigoExibicao() {
        StringBuilder linha = new StringBuilder();
        if (codigo != null) {
            linha.append("Cód. ").append(codigo);
        }
        String eanTexto = ean == null ? "" : String.valueOf(ean).trim();
        if (!eanTexto.isEmpty() && !"null".equals(eanTexto)) {
            if (linha.length() > 0) {
                linha.append(" · ");
            }
            linha.append("EAN ").append(eanTexto);
        }
        return linha.toString();
    }

    public String precoExibicao() {
        if (preco == null || preco.trim().isEmpty()) {
            return "";
        }
        try {
            double valor = Double.parseDouble(preco.trim().replace(",", "."));
            return java.text.NumberFormat.getCurrencyInstance(new java.util.Locale("pt", "BR")).format(valor);
        } catch (NumberFormatException ignored) {
            return "R$ " + preco.trim();
        }
    }

    public String detalheExibicao() {
        StringBuilder linha = new StringBuilder();
        if (ncm != null && !ncm.trim().isEmpty()) {
            linha.append("NCM ").append(ncm.trim());
        }
        if (unidademedida != null && !unidademedida.trim().isEmpty()) {
            if (linha.length() > 0) {
                linha.append(" · ");
            }
            linha.append(unidademedida.trim());
        }
        return linha.toString();
    }
}

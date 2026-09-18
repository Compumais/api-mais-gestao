package com.pos_mais_gestao.util;

import com.pos_mais_gestao.domain.Produto;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.Locale;

/** Regras de unidade e quantidade para produtos vendidos por peso. */
public final class ProdutoQuantidade {
    private ProdutoQuantidade() {}

    public static boolean vendidoPorQuilograma(Produto produto) {
        return produto != null && unidadeQuilograma(produto.getUnidadeMedida());
    }

    public static boolean unidadeQuilograma(String unidade) {
        if (unidade == null) {
            return false;
        }
        String normalizada = Normalizer.normalize(unidade, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .trim()
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z]", "");
        return "KG".equals(normalizada)
                || "KGS".equals(normalizada)
                || "QUILO".equals(normalizada)
                || "QUILOS".equals(normalizada)
                || "QUILOGRAMA".equals(normalizada)
                || "QUILOGRAMAS".equals(normalizada);
    }

    /**
     * Aceita separador decimal brasileiro ou internacional sem limitar a escala.
     * Retorna {@code null} para conteúdo inválido ou quantidade não positiva.
     */
    public static BigDecimal normalizar(String valor) {
        if (valor == null) {
            return null;
        }
        String limpo = valor.trim().replace(" ", "").replace("\u00a0", "");
        if (limpo.isEmpty()) {
            return null;
        }
        int ultimaVirgula = limpo.lastIndexOf(',');
        int ultimoPonto = limpo.lastIndexOf('.');
        if (ultimaVirgula >= 0 && ultimoPonto >= 0) {
            if (ultimaVirgula > ultimoPonto) {
                limpo = limpo.replace(".", "").replace(",", ".");
            } else {
                limpo = limpo.replace(",", "");
            }
        } else if (ultimaVirgula >= 0) {
            limpo = limpo.replace(",", ".");
        }
        if (!limpo.matches("\\d+(\\.\\d+)?")) {
            return null;
        }
        try {
            BigDecimal quantidade = new BigDecimal(limpo);
            return quantidade.compareTo(BigDecimal.ZERO) > 0 ? quantidade.stripTrailingZeros() : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public static String exibir(BigDecimal quantidade) {
        if (quantidade == null) {
            return "0";
        }
        return quantidade.stripTrailingZeros().toPlainString().replace(".", ",");
    }

    public static String exibir(String quantidade) {
        BigDecimal normalizada = normalizar(quantidade);
        return normalizada != null ? exibir(normalizada) : (quantidade == null ? "0" : quantidade);
    }
}

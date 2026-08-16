package com.pos_mais_gestao.util;

import com.pos_mais_gestao.domain.Produto;
import java.math.BigDecimal;

/**
 * Pizza meio a meio: dois produtos com {@code espizza=1}.
 * Preço = o maior entre as metades. Quantidade = 1 pizza.
 * NFC-e/estoque usam o produto de maior preço como base.
 */
public final class PizzaMeioAMeio {
    public static final int DESCRICAO_NFCE_MAX = 120;

    private PizzaMeioAMeio() {}

    public static String descricao(Produto primeiro, Produto segundo) {
        String texto =
                "Pizza meio a meio: " + primeiro.getDescricao() + " / " + segundo.getDescricao();
        if (texto.length() <= DESCRICAO_NFCE_MAX) {
            return texto;
        }
        return texto.substring(0, DESCRICAO_NFCE_MAX);
    }

    public static BigDecimal preco(Produto primeiro, Produto segundo) {
        return primeiro.getPreco().max(segundo.getPreco());
    }

    /** Produto fiscal/estoque/impressão: o de maior preço (empate: o primeiro). */
    public static Produto principal(Produto primeiro, Produto segundo) {
        if (primeiro.getPreco().compareTo(segundo.getPreco()) >= 0) {
            return primeiro;
        }
        return segundo;
    }

    public static Produto outro(Produto primeiro, Produto segundo) {
        Produto base = principal(primeiro, segundo);
        return base.getId().equals(primeiro.getId()) ? segundo : primeiro;
    }
}

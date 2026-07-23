package com.pos_mais_gestao.domain;

import java.io.Serializable;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/** Item para geração de fichas de evento (1 ficha por unidade). */
public class ItemFicha implements Serializable {
    private static final long serialVersionUID = 1L;

    public final String nome;
    public final int quantidade;

    public ItemFicha(String nome, int quantidade) {
        this.nome = nome != null ? nome : "Produto";
        this.quantidade = Math.max(0, quantidade);
    }

    public static List<ItemFicha> deCarrinho(List<ItemCarrinho> itens) {
        List<ItemFicha> out = new ArrayList<>();
        if (itens == null) {
            return out;
        }
        for (ItemCarrinho item : itens) {
            if (item == null || item.getProduto() == null) {
                continue;
            }
            int qty = item.getQuantidade().setScale(0, RoundingMode.HALF_UP).intValue();
            if (qty > 0) {
                out.add(new ItemFicha(item.getProduto().getDescricao(), qty));
            }
        }
        return out;
    }

    public static List<ItemFicha> deItensMesa(
            List<com.pos_mais_gestao.data.api.ContaMesaItemDto> itens) {
        List<ItemFicha> out = new ArrayList<>();
        if (itens == null) {
            return out;
        }
        for (com.pos_mais_gestao.data.api.ContaMesaItemDto item : itens) {
            if (item == null) {
                continue;
            }
            int qty;
            try {
                qty = new BigDecimal(item.quantidade != null ? item.quantidade : "0")
                        .setScale(0, RoundingMode.HALF_UP)
                        .intValue();
            } catch (Exception e) {
                qty = 0;
            }
            if (qty > 0) {
                out.add(new ItemFicha(item.nomeproduto, qty));
            }
        }
        return out;
    }
}

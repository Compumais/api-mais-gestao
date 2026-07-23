package com.pos_mais_gestao.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

public class Carrinho {
    private static final Carrinho INSTANCE = new Carrinho();

    private final List<ItemCarrinho> itens = new ArrayList<>();

    public static Carrinho getInstance() {
        return INSTANCE;
    }

    public List<ItemCarrinho> getItens() {
        return itens;
    }

    public void limpar() {
        itens.clear();
    }

    public void adicionar(Produto produto) {
        for (ItemCarrinho item : itens) {
            if (item.getProduto().getId().equals(produto.getId())) {
                item.incrementar();
                return;
            }
        }
        itens.add(new ItemCarrinho(produto, BigDecimal.ONE));
    }

    public void removerSeZero() {
        Iterator<ItemCarrinho> it = itens.iterator();
        while (it.hasNext()) {
            if (it.next().getQuantidade().compareTo(BigDecimal.ZERO) <= 0) {
                it.remove();
            }
        }
    }

    public BigDecimal getTotal() {
        BigDecimal total = BigDecimal.ZERO;
        for (ItemCarrinho item : itens) {
            total = total.add(item.getSubtotal());
        }
        return total.setScale(2, RoundingMode.HALF_UP);
    }

    public boolean isVazio() {
        return itens.isEmpty();
    }
}

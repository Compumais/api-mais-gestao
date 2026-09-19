package com.pos_mais_gestao.ui.pedido;

final class CatalogoGourmetFiltro {
    private CatalogoGourmetFiltro() {}

    static boolean mostrarCardsDeGrupo(String grupoAtivo, String busca) {
        return grupoAtivo == null && normalizarBusca(busca).isEmpty();
    }

    static String grupoParaConsulta(String grupoAtivo, String busca) {
        return normalizarBusca(busca).isEmpty() ? grupoAtivo : "";
    }

    static String normalizarBusca(String busca) {
        return busca == null ? "" : busca.trim();
    }
}

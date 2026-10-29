package com.pos_mais_gestao.data.api;

import java.util.ArrayList;
import java.util.List;

public class PaginaVendas {
    public final List<VendaResumoDto> vendas;
    public final int page;
    public final int limit;
    public final int total;
    public final int totalPages;

    public PaginaVendas(
            List<VendaResumoDto> vendas, int page, int limit, int total, int totalPages) {
        this.vendas = vendas != null ? vendas : new ArrayList<>();
        this.page = page;
        this.limit = limit;
        this.total = total;
        this.totalPages = totalPages;
    }

    public boolean temMais() {
        return page < totalPages;
    }
}

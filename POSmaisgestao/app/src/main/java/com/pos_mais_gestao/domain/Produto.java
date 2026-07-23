package com.pos_mais_gestao.domain;

import java.io.Serializable;
import java.math.BigDecimal;

public class Produto implements Serializable {
    private final String id;
    private final String descricao;
    private final BigDecimal preco;
    private final String unidadeMedida;
    private final String idUnidadeMedida;
    private final Integer codigo;

    public Produto(
            String id,
            String descricao,
            BigDecimal preco,
            String unidadeMedida,
            String idUnidadeMedida,
            Integer codigo) {
        this.id = id;
        this.descricao = descricao;
        this.preco = preco != null ? preco : BigDecimal.ZERO;
        this.unidadeMedida = unidadeMedida != null && !unidadeMedida.isEmpty() ? unidadeMedida : "UN";
        this.idUnidadeMedida = idUnidadeMedida;
        this.codigo = codigo;
    }

    public String getId() {
        return id;
    }

    public String getDescricao() {
        return descricao;
    }

    public BigDecimal getPreco() {
        return preco;
    }

    public String getUnidadeMedida() {
        return unidadeMedida;
    }

    public String getIdUnidadeMedida() {
        return idUnidadeMedida;
    }

    public Integer getCodigo() {
        return codigo;
    }
}

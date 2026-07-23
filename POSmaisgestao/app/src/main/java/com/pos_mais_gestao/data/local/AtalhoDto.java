package com.pos_mais_gestao.data.local;

import com.pos_mais_gestao.domain.Produto;
import java.math.BigDecimal;

public class AtalhoDto {
    public String id;
    public String descricao;
    public String preco;
    public String unidadeMedida;
    public String idUnidadeMedida;
    public Integer codigo;

    public static AtalhoDto from(Produto produto) {
        AtalhoDto dto = new AtalhoDto();
        dto.id = produto.getId();
        dto.descricao = produto.getDescricao();
        dto.preco = produto.getPreco().toPlainString();
        dto.unidadeMedida = produto.getUnidadeMedida();
        dto.idUnidadeMedida = produto.getIdUnidadeMedida();
        dto.codigo = produto.getCodigo();
        return dto;
    }

    public Produto toProduto() {
        BigDecimal valor = BigDecimal.ZERO;
        try {
            if (preco != null && !preco.isEmpty()) {
                valor = new BigDecimal(preco);
            }
        } catch (Exception ignored) {
        }
        return new Produto(id, descricao, valor, unidadeMedida, idUnidadeMedida, codigo);
    }
}

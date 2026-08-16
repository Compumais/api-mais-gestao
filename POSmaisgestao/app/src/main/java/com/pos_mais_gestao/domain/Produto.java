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
    /** Conteúdo da imagem (data URL / base64) ou URL, conforme cadastro. */
    private final String imagem;
    /** Caminho ou URL auxiliar da imagem. */
    private final String caminhoImagem;
    /** Cadastro gourmet: 1 = pizza (habilita meio a meio). */
    private final boolean espizza;

    public Produto(
            String id,
            String descricao,
            BigDecimal preco,
            String unidadeMedida,
            String idUnidadeMedida,
            Integer codigo) {
        this(id, descricao, preco, unidadeMedida, idUnidadeMedida, codigo, null, null, false);
    }

    public Produto(
            String id,
            String descricao,
            BigDecimal preco,
            String unidadeMedida,
            String idUnidadeMedida,
            Integer codigo,
            String imagem,
            String caminhoImagem) {
        this(id, descricao, preco, unidadeMedida, idUnidadeMedida, codigo, imagem, caminhoImagem, false);
    }

    public Produto(
            String id,
            String descricao,
            BigDecimal preco,
            String unidadeMedida,
            String idUnidadeMedida,
            Integer codigo,
            String imagem,
            String caminhoImagem,
            boolean espizza) {
        this.id = id;
        this.descricao = descricao;
        this.preco = preco != null ? preco : BigDecimal.ZERO;
        this.unidadeMedida = unidadeMedida != null && !unidadeMedida.isEmpty() ? unidadeMedida : "UN";
        this.idUnidadeMedida = idUnidadeMedida;
        this.codigo = codigo;
        this.imagem = imagem;
        this.caminhoImagem = caminhoImagem;
        this.espizza = espizza;
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

    public String getImagem() {
        return imagem;
    }

    public String getCaminhoImagem() {
        return caminhoImagem;
    }

    public boolean isEspizza() {
        return espizza;
    }

    public Produto comPreco(BigDecimal novoPreco) {
        return new Produto(
                id, descricao, novoPreco, unidadeMedida, idUnidadeMedida, codigo, imagem, caminhoImagem, espizza);
    }

    public Produto comDescricaoEPreco(String novaDescricao, BigDecimal novoPreco) {
        return new Produto(
                id,
                novaDescricao,
                novoPreco,
                unidadeMedida,
                idUnidadeMedida,
                codigo,
                imagem,
                caminhoImagem,
                espizza);
    }
}

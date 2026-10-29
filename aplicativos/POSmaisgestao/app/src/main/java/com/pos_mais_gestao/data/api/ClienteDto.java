package com.pos_mais_gestao.data.api;

public class ClienteDto {
    public String id;
    public String nome;
    public String razaosocial;
    public String cnpjcpf;

    public String nomeExibicao() {
        if (nome != null && !nome.trim().isEmpty()) {
            return nome.trim();
        }
        if (razaosocial != null && !razaosocial.trim().isEmpty()) {
            return razaosocial.trim();
        }
        return id != null ? id : "Cliente";
    }

    public String documentoExibicao() {
        if (cnpjcpf == null || cnpjcpf.trim().isEmpty()) {
            return "";
        }
        return cnpjcpf.trim();
    }
}

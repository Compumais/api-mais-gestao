package com.maisgestao.nfe.data.api.dto;

public class EntidadeDto {
    public String id;
    public String idempresa;
    public String nome;
    public String razaosocial;
    public Integer tipopessoa;
    public String cnpjcpf;
    public String inscricaoestadual;
    public String rg;
    public String email;
    public String telefone;
    public String endereco;
    public String numeroendereco;
    public String complemento;
    public String bairro;
    public String idcidade;
    public String idestado;
    public String cep;
    public String fax;
    public String nascimento;
    public String idplanocontas;
    public String pais;
    public Integer cliente;
    public Integer fornecedor;
    public Integer transportador;
    public Integer representante;
    public Integer indiedest;

    public String nomeExibicao() {
        if (nome != null && !nome.trim().isEmpty()) {
            return nome.trim();
        }
        if (razaosocial != null && !razaosocial.trim().isEmpty()) {
            return razaosocial.trim();
        }
        return "Cliente";
    }

    public String documentoExibicao() {
        if (cnpjcpf == null || cnpjcpf.trim().isEmpty()) {
            return "";
        }
        return cnpjcpf.trim();
    }

    public String contatoExibicao() {
        String tel = telefone == null ? "" : telefone.trim();
        String mail = email == null ? "" : email.trim();
        if (tel.isEmpty()) {
            return mail;
        }
        if (mail.isEmpty()) {
            return tel;
        }
        return tel + " · " + mail;
    }

    public String enderecoExibicao() {
        StringBuilder linha = new StringBuilder();
        append(linha, endereco);
        append(linha, numeroendereco);
        append(linha, bairro);
        append(linha, cep);
        return linha.toString();
    }

    private static void append(StringBuilder linha, String parte) {
        if (parte == null || parte.trim().isEmpty()) {
            return;
        }
        if (linha.length() > 0) {
            linha.append(", ");
        }
        linha.append(parte.trim());
    }
}

package com.maisgestao.nfe.data.api.dto;

public class SerieDto {
    public String id;
    /** Campo da API (`nfeserie.serie`). */
    public String serie;
    public String numero;
    public String modelo;
    public Integer ambiente;
    public Boolean ativo;
    public Boolean ativa;

    public String numeroExibicao() {
        if (serie != null && !serie.trim().isEmpty()) {
            return serie.trim();
        }
        if (numero != null && !numero.trim().isEmpty()) {
            return numero.trim();
        }
        return "";
    }

    public boolean inativa() {
        return Boolean.FALSE.equals(ativo) || Boolean.FALSE.equals(ativa);
    }

    public String rotulo() {
        String amb = ambiente != null && ambiente == 1 ? "Produção" : "Homologação";
        String n = numeroExibicao();
        return n.isEmpty() ? amb : "Série " + n + " — " + amb;
    }
}

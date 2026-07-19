package com.pos_mais_gestao.data.api;

import java.io.Serializable;

/** Resumo de venda PDV (NFC-e/gourmet) ou pedido DAV origem POS. */
public class VendaResumoDto implements Serializable {
    public enum Tipo {
        PDV,
        DAV
    }

    public Tipo tipo;
    public String id;
    /** Código amigável (DAV) ou trecho do id (PDV). */
    public String codigo;
    public String dataHora;
    public String valorTotal;
    public String pagamentosResumo;
    public Integer numeropdv;
    public boolean mesa;
    /** Venda criada pelo app POS (não balcão web/gourmet). */
    public boolean origemPos;
    public String idNotaFiscal;
    public Integer statusDav;
    public String nomeCliente;
    public String meioPagamentoLabel;
}

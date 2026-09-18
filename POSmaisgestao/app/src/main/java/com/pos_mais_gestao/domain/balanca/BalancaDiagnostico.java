package com.pos_mais_gestao.domain.balanca;

public final class BalancaDiagnostico {
    public final BalancaEstado estado;
    public final String mensagem;
    public final String dispositivo;
    public final String driver;
    public final int vendorId;
    public final int productId;
    public final String ultimoPeso;
    public final long ultimaComunicacao;
    public final String ultimoErro;
    public final String ultimoTxHex;
    public final String ultimoRxHex;

    public BalancaDiagnostico(
            BalancaEstado estado,
            String mensagem,
            String dispositivo,
            String driver,
            int vendorId,
            int productId,
            String ultimoPeso,
            long ultimaComunicacao,
            String ultimoErro,
            String ultimoTxHex,
            String ultimoRxHex) {
        this.estado = estado;
        this.mensagem = mensagem;
        this.dispositivo = dispositivo;
        this.driver = driver;
        this.vendorId = vendorId;
        this.productId = productId;
        this.ultimoPeso = ultimoPeso;
        this.ultimaComunicacao = ultimaComunicacao;
        this.ultimoErro = ultimoErro;
        this.ultimoTxHex = ultimoTxHex;
        this.ultimoRxHex = ultimoRxHex;
    }
}

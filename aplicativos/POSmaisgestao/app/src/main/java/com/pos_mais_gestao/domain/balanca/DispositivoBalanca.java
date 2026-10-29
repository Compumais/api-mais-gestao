package com.pos_mais_gestao.domain.balanca;

public final class DispositivoBalanca {
    public final int vendorId;
    public final int productId;
    public final String serial;
    public final String nome;
    public final String driver;

    public DispositivoBalanca(int vendorId, int productId, String serial, String nome, String driver) {
        this.vendorId = vendorId;
        this.productId = productId;
        this.serial = serial == null ? "" : serial;
        this.nome = nome;
        this.driver = driver;
    }

    public String chave() {
        return vendorId + ":" + productId + ":" + serial;
    }

    public String detalhe() {
        return String.format("VID %04X · PID %04X · %s", vendorId, productId, driver);
    }
}

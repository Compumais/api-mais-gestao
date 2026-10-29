package com.pos_mais_gestao.domain.balanca;

public final class BalancaConfig {
    public static final String PROTOCOLO_PRT3 = "prt3";
    public static final int BAUD_PADRAO = 2400;

    public final boolean habilitada;
    public final int vendorId;
    public final int productId;
    public final String serial;
    public final int baudRate;
    public final int dataBits;
    public final int stopBits;
    public final int parity;
    public final boolean logHex;

    public BalancaConfig(
            boolean habilitada,
            int vendorId,
            int productId,
            String serial,
            int baudRate,
            int dataBits,
            int stopBits,
            int parity,
            boolean logHex) {
        this.habilitada = habilitada;
        this.vendorId = vendorId;
        this.productId = productId;
        this.serial = serial == null ? "" : serial;
        this.baudRate = baudRate;
        this.dataBits = dataBits;
        this.stopBits = stopBits;
        this.parity = parity;
        this.logHex = logHex;
    }

    public boolean temDispositivoSelecionado() {
        return vendorId >= 0 && productId >= 0;
    }
}

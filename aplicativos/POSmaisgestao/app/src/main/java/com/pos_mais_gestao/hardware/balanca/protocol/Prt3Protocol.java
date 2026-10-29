package com.pos_mais_gestao.hardware.balanca.protocol;

public final class Prt3Protocol {
    public static final byte ENQ = 0x05;
    public static final byte STX = 0x02;
    public static final byte ETX = 0x03;

    private Prt3Protocol() {}

    public static byte[] solicitarPeso() {
        return new byte[] {ENQ};
    }
}

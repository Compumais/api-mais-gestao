package com.pos_mais_gestao.ui.mesas;

public final class AberturaMesaPolicy {
    private AberturaMesaPolicy() {}

    public static boolean devePedirNome(boolean flagHabilitada, boolean contaJaAberta) {
        return flagHabilitada && !contaJaAberta;
    }
}

package com.pos_mais_gestao.domain.balanca;

import java.math.BigDecimal;
import java.util.concurrent.atomic.AtomicBoolean;

/** Garante que uma seleção de produto consuma no máximo um peso estável. */
public final class SessaoPesagem {
    private final AtomicBoolean concluida = new AtomicBoolean(false);

    public BigDecimal consumir(BalancaLeitura leitura) {
        if (leitura == null || !leitura.isPesoValido() || !concluida.compareAndSet(false, true)) {
            return null;
        }
        return leitura.getPesoKg();
    }

    public boolean isConcluida() {
        return concluida.get();
    }
}

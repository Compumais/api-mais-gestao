package com.pos_mais_gestao.domain.balanca;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.math.BigDecimal;
import org.junit.Test;

public class SessaoPesagemTest {
    @Test
    public void aceitaSomentePrimeiroPesoEstavelPositivo() {
        SessaoPesagem sessao = new SessaoPesagem();

        assertNull(sessao.consumir(BalancaLeitura.estado(BalancaEstado.INSTAVEL, "Instável")));
        assertFalse(sessao.isConcluida());
        assertEquals(new BigDecimal("1.250"), sessao.consumir(BalancaLeitura.peso(new BigDecimal("1.250"))));
        assertTrue(sessao.isConcluida());
        assertNull(sessao.consumir(BalancaLeitura.peso(new BigDecimal("2.000"))));
    }

    @Test
    public void naoConsomePesoZero() {
        SessaoPesagem sessao = new SessaoPesagem();

        assertNull(sessao.consumir(BalancaLeitura.peso(new BigDecimal("0.000"))));
        assertFalse(sessao.isConcluida());
    }
}

package com.pos_mais_gestao.util;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import com.pos_mais_gestao.domain.LancamentoPagamento;
import com.pos_mais_gestao.domain.MeioPagamento;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import org.junit.Test;

public class PagamentosMistoTest {
    @Test
    public void soOkSomaNoRestante() {
        LancamentoPagamento pix = LancamentoPagamento.ok(MeioPagamento.PIX, bd("40"));
        LancamentoPagamento pendente = LancamentoPagamento.ok(MeioPagamento.CARTAO, bd("30"));
        pendente.status = LancamentoPagamento.STATUS_PENDENTE;
        LancamentoPagamento cancelado = LancamentoPagamento.ok(MeioPagamento.DINHEIRO, bd("20"));
        cancelado.status = LancamentoPagamento.STATUS_CANCELADO;

        assertEquals(bd("40.00"), PagamentosMisto.somarOk(Arrays.asList(pix, pendente, cancelado)));
        assertEquals(bd("60.00"), PagamentosMisto.restante(bd("100"), Arrays.asList(pix, pendente)));
        assertTrue(PagamentosMisto.temPendente(Arrays.asList(pix, pendente)));
    }

    @Test
    public void fechaComDoisMeiosETrocoEmDinheiro() {
        LancamentoPagamento pix = LancamentoPagamento.ok(MeioPagamento.PIX, bd("60"));
        LancamentoPagamento dinheiro = LancamentoPagamento.ok(MeioPagamento.DINHEIRO, bd("50"));
        PagamentosMisto.ResultadoFechamento r =
                PagamentosMisto.validarFechamento(bd("100"), Arrays.asList(pix, dinheiro), null);
        assertEquals(bd("10.00"), r.troco);
        assertEquals(bd("50.00"), r.totais.dinheiro);
        assertEquals(bd("60.00"), r.totais.pix);
        assertTrue(PagamentosMisto.podeFechar(bd("100"), Arrays.asList(pix, dinheiro)));
    }

    @Test
    public void pendenteBloqueiaFechamento() {
        LancamentoPagamento pix = LancamentoPagamento.ok(MeioPagamento.PIX, bd("100"));
        pix.status = LancamentoPagamento.STATUS_PENDENTE;
        try {
            PagamentosMisto.validarFechamento(bd("100"), Collections.singletonList(pix), null);
            fail("deveria bloquear pendente");
        } catch (IllegalArgumentException e) {
            assertTrue(e.getMessage().contains("pendente"));
        }
        assertFalse(PagamentosMisto.podeFechar(bd("100"), Collections.singletonList(pix)));
    }

    @Test
    public void trocoSemDinheiroFalha() {
        LancamentoPagamento pix = LancamentoPagamento.ok(MeioPagamento.PIX, bd("120"));
        try {
            PagamentosMisto.validarFechamento(bd("100"), Collections.singletonList(pix), bd("20"));
            fail("troco sem dinheiro");
        } catch (IllegalArgumentException e) {
            assertTrue(e.getMessage().toLowerCase().contains("troco"));
        }
        assertTrue(PagamentosMisto.valorExcedeRestante(MeioPagamento.PIX, bd("80"), bd("40")));
        assertFalse(PagamentosMisto.valorExcedeRestante(MeioPagamento.DINHEIRO, bd("80"), bd("40")));
    }

    private static BigDecimal bd(String v) {
        return new BigDecimal(v);
    }
}

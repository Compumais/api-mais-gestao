package com.pos_mais_gestao.ui.mesas;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class AberturaMesaPolicyTest {
    @Test
    public void pedeNomeSomenteParaContaLivreComFlagAtiva() {
        assertTrue(AberturaMesaPolicy.devePedirNome(true, false));
        assertFalse(AberturaMesaPolicy.devePedirNome(false, false));
        assertFalse(AberturaMesaPolicy.devePedirNome(true, true));
    }
}

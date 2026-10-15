package com.pos_mais_gestao.util;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class TelefoneBrasilTest {
    @Test
    public void formataCelularEFixo() {
        assertEquals("(11) 98765-4321", TelefoneBrasil.formatar("11987654321"));
        assertEquals("(11) 3456-7890", TelefoneBrasil.formatar("1134567890"));
        assertEquals("(11) 98765-4321", TelefoneBrasil.formatar("(11) 98765-4321"));
    }

    @Test
    public void validaTamanho() {
        assertTrue(TelefoneBrasil.valido("11987654321"));
        assertTrue(TelefoneBrasil.valido("(11) 3456-7890"));
        assertFalse(TelefoneBrasil.valido("119876543"));
        assertFalse(TelefoneBrasil.valido(""));
    }

    @Test
    public void ignoraPlaceholderCliente() {
        assertEquals("", TelefoneBrasil.nomeInformado("Cliente"));
        assertEquals("", TelefoneBrasil.nomeInformado("  cliente  "));
        assertEquals("Maria", TelefoneBrasil.nomeInformado(" Maria "));
    }
}

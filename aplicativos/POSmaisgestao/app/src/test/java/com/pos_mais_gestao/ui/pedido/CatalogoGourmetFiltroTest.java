package com.pos_mais_gestao.ui.pedido;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class CatalogoGourmetFiltroTest {
    @Test
    public void primeiraAbaSemBuscaMostraGrupos() {
        assertTrue(CatalogoGourmetFiltro.mostrarCardsDeGrupo(null, ""));
        assertFalse(CatalogoGourmetFiltro.mostrarCardsDeGrupo("bebidas", ""));
    }

    @Test
    public void buscaIgnoraGrupoSelecionado() {
        assertEquals("", CatalogoGourmetFiltro.grupoParaConsulta("bebidas", " café "));
        assertFalse(CatalogoGourmetFiltro.mostrarCardsDeGrupo(null, "café"));
    }

    @Test
    public void semBuscaMantemFiltroDaAba() {
        assertEquals("bebidas", CatalogoGourmetFiltro.grupoParaConsulta("bebidas", "  "));
    }
}

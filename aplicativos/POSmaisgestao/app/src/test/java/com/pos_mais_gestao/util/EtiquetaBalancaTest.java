package com.pos_mais_gestao.util;

import com.pos_mais_gestao.domain.Produto;
import java.math.BigDecimal;
import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;

public class EtiquetaBalancaTest {
    @Test
    public void ignoraQuandoDesligada() {
        assertNull(EtiquetaBalanca.parsear("2000100010001", EtiquetaBalanca.Config.desligada()));
    }

    @Test
    public void lePrecoComQuatroDigitos() {
        EtiquetaBalanca.Config config = new EtiquetaBalanca.Config(true, "2", 4, false, true, false);
        String doze = "200010012500";
        String codigo = doze + EtiquetaBalanca.dvEan13(doze);
        EtiquetaBalanca.Parseada parse = EtiquetaBalanca.parsear(codigo, config);
        assertNotNull(parse);
        assertEquals(1, parse.codigo);
        assertEquals(0, parse.valor.compareTo(new BigDecimal("125.000")));
    }

    @Test
    public void lePesoECalculaQuantidade() {
        EtiquetaBalanca.Config config = new EtiquetaBalanca.Config(true, "2", 4, true, true, false);
        String doze = "200350003500";
        String codigo = doze + EtiquetaBalanca.dvEan13(doze);
        EtiquetaBalanca.Parseada parse = EtiquetaBalanca.parsear(codigo, config);
        assertNotNull(parse);
        assertEquals(35, parse.codigo);
        Produto produto = new Produto("p", "Queijo", new BigDecimal("40.00"), "KG", null, 35);
        EtiquetaBalanca.Lancamento lancamento = EtiquetaBalanca.montar(produto, parse, config);
        assertEquals(0, lancamento.quantidade.compareTo(new BigDecimal("3.500")));
        assertEquals(0, lancamento.precoUnitario.compareTo(new BigDecimal("40.00")));
    }

    @Test
    public void rejeitaDigitoVerificadorInvalido() {
        EtiquetaBalanca.Config config = new EtiquetaBalanca.Config(true, "2", 4, false, true, false);
        assertNull(EtiquetaBalanca.parsear("2000100125000", config));
    }
}

package com.pos_mais_gestao.hardware.balanca.protocol;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import com.pos_mais_gestao.domain.balanca.BalancaEstado;
import com.pos_mais_gestao.domain.balanca.BalancaLeitura;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.Test;

public class Prt3ParserTest {
    @Test
    public void lePesoNormalEZero() {
        BalancaLeitura normal = parse("\u000214385\u0003").get(0);
        BalancaLeitura zero = parse("\u000200000\u0003").get(0);

        assertEquals("14.385", normal.getPesoKg().toPlainString());
        assertTrue(normal.isPesoValido());
        assertEquals("0.000", zero.getPesoKg().toPlainString());
        assertFalse(zero.isPesoValido());
    }

    @Test
    public void distingueEstadosDaBalanca() {
        assertEquals(BalancaEstado.INSTAVEL, parse("\u0002IIIII\u0003").get(0).getEstado());
        assertEquals(BalancaEstado.PESO_NEGATIVO, parse("\u0002NNNNN\u0003").get(0).getEstado());
        assertEquals(BalancaEstado.SOBRECARGA, parse("\u0002SSSSS\u0003").get(0).getEstado());
    }

    @Test
    public void rejeitaFrameIncompletoECaracteresInvalidos() {
        assertTrue(parse("\u0002123").isEmpty());
        assertEquals(BalancaEstado.ERRO, parse("\u0002123\u0003").get(0).getEstado());
        assertEquals(BalancaEstado.ERRO, parse("\u000212A45\u0003").get(0).getEstado());
    }

    @Test
    public void processaMultiplosFramesERuido() {
        List<BalancaLeitura> leituras = parse("lixo\u000200100\u0003xx\u000200250\u0003");

        assertEquals(2, leituras.size());
        assertEquals("0.100", leituras.get(0).getPesoKg().toPlainString());
        assertEquals("0.250", leituras.get(1).getPesoKg().toPlainString());
    }

    @Test
    public void recuperaSincronizacaoEmNovoStxEChunks() {
        Prt3Parser parser = new Prt3Parser();
        byte[] primeiro = "\u0002ruido\u000201".getBytes(StandardCharsets.ISO_8859_1);
        byte[] segundo = "250\u0003".getBytes(StandardCharsets.ISO_8859_1);

        assertTrue(parser.aceitar(primeiro, primeiro.length).isEmpty());
        List<BalancaLeitura> leituras = parser.aceitar(segundo, segundo.length);
        assertEquals(1, leituras.size());
        assertEquals("1.250", leituras.get(0).getPesoKg().toPlainString());
    }

    @Test
    public void comandoDePesoEhEnq() {
        assertArrayEquals(new byte[] {0x05}, Prt3Protocol.solicitarPeso());
    }

    private List<BalancaLeitura> parse(String valor) {
        byte[] bytes = valor.getBytes(StandardCharsets.ISO_8859_1);
        return new Prt3Parser().aceitar(bytes, bytes.length);
    }
}

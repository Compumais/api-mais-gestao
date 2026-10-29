package com.pos_mais_gestao.util;

import com.pos_mais_gestao.domain.PagamentosResumo;
import com.pos_mais_gestao.domain.ResumoTurnoCaixa;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

public class CupomTextoTest {
    @Test
    public void vendaTrazEmpresaDataItensEPagamento() {
        CupomTexto.Cabecalho cab = cab(CupomTexto.COLUNAS_58);
        String texto = CupomTexto.venda(
                cab,
                "COMPROVANTE NAO FISCAL",
                "1842",
                "Mesa 4",
                "Jose da Silva",
                null,
                Collections.singletonList(new CupomTexto.LinhaItem(
                        "Cafe", new BigDecimal("2"), new BigDecimal("5.00"), new BigDecimal("10.00"))),
                new BigDecimal("10.00"),
                Collections.singletonList(new CupomTexto.LinhaPagamento("Dinheiro", new BigDecimal("20.00"))),
                new BigDecimal("10.00"),
                Collections.singletonList("NFC-e NAO TRANSMITIDA"));
        assertTrue(texto.contains("Padaria Acao"));
        assertTrue(texto.contains("CNPJ 12.345.678/0001-99"));
        assertTrue(texto.contains("Rua das Flores, 10"));
        assertTrue(texto.contains("20/10/2026 15:04"));
        assertTrue(texto.contains("Codigo"));
        assertTrue(texto.contains("1842"));
        assertTrue(texto.contains("Mesa 4"));
        assertTrue(texto.contains("Cliente: Jose da Silva"));
        assertTrue(texto.contains("Cafe"));
        assertTrue(texto.contains("2 x"));
        assertTrue(texto.contains("TOTAL"));
        assertTrue(texto.contains("Troco"));
        assertTrue(texto.contains("NAO E DOCUMENTO FISCAL"));
        assertTrue(texto.contains("NFC-e NAO TRANSMITIDA"));
        assertEquals(CupomTexto.COLUNAS_58, texto.indexOf('\n') > 0
                ? linhaSeparador(texto).length()
                : 0);
    }

    @Test
    public void largura80Usa48Colunas() {
        String texto = CupomTexto.abertura(cab(CupomTexto.COLUNAS_80), new BigDecimal("50"), "9");
        assertEquals(48, linhaSeparador(texto).length());
        assertTrue(texto.contains("ABERTURA DE CAIXA"));
        assertTrue(texto.contains("Suprimento"));
        assertTrue(texto.contains("Caixa"));
    }

    @Test
    public void conferenciaNaoMostraPagamento() {
        String texto = CupomTexto.conferencia(
                cab(CupomTexto.COLUNAS_58),
                "Comanda 12",
                "Ana",
                "11999998888",
                Arrays.asList(new CupomTexto.LinhaItem(
                        "Suco", BigDecimal.ONE, new BigDecimal("8"), new BigDecimal("8"))),
                new BigDecimal("8"));
        assertTrue(texto.contains("CONFERENCIA"));
        assertTrue(texto.contains("Comanda 12"));
        assertTrue(texto.contains("Sem valor de pagamento"));
        assertTrue(!texto.contains("Dinheiro"));
    }

    @Test
    public void fechamentoMostraSobraEAbertura() {
        ResumoTurnoCaixa resumo = new ResumoTurnoCaixa();
        resumo.qtdVendas = 2;
        resumo.suprimento = new BigDecimal("100.00");
        resumo.pagamentos = new PagamentosResumo();
        resumo.pagamentos.dinheiro = new BigDecimal("40.00");
        resumo.pagamentos.pix = new BigDecimal("10.00");
        resumo.recalcular();
        String texto = CupomTexto.fechamento(
                cab(CupomTexto.COLUNAS_58),
                resumo,
                new BigDecimal("150.00"),
                "sangria no meio do turno",
                "2026-10-20T09:00:00");
        assertTrue(texto.contains("FECHAMENTO DE CAIXA"));
        assertTrue(texto.contains("Aberto em"));
        assertTrue(texto.contains("20/10/2026 09:00"));
        assertTrue(texto.contains("Sobra"));
        assertTrue(texto.contains("sangria no meio do turno"));
    }

    @Test
    public void montaEnderecoECnpj() {
        assertEquals(
                "Rua A, 5 sala 2 - Centro - CEP 01001-000",
                CupomTexto.endereco("Rua A", "5", "sala 2", "Centro", "01001-000"));
        assertEquals("12.345.678/0001-99", CupomTexto.formatarCnpj("12.345.678/0001-99"));
    }

    private static CupomTexto.Cabecalho cab(int colunas) {
        return new CupomTexto.Cabecalho(
                "Padaria Ação",
                "12345678000199",
                "Rua das Flores, 10 - Centro",
                "1133334444",
                "Maria",
                2,
                colunas,
                momento());
    }

    private static Date momento() {
        Calendar calendario = Calendar.getInstance();
        calendario.set(2026, Calendar.OCTOBER, 20, 15, 4, 0);
        calendario.set(Calendar.MILLISECOND, 0);
        return calendario.getTime();
    }

    private static String linhaSeparador(String texto) {
        for (String linha : texto.split("\n")) {
            if (linha.startsWith("---")) {
                return linha;
            }
        }
        return "";
    }
}

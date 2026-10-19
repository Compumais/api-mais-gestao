package com.pos_mais_gestao.ui.mesas;

import static org.junit.Assert.assertEquals;
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

    @Test
    public void exigeNomeETelefoneQuandoAmbosObrigatorios() {
        assertEquals(
                AberturaMesaPolicy.ErroIdentificacao.NOME_OBRIGATORIO,
                AberturaMesaPolicy.validarIdentificacao("", "", true, true));
        assertEquals(
                AberturaMesaPolicy.ErroIdentificacao.TELEFONE_OBRIGATORIO,
                AberturaMesaPolicy.validarIdentificacao("Ana", "", true, true));
        assertEquals(
                AberturaMesaPolicy.ErroIdentificacao.OK,
                AberturaMesaPolicy.validarIdentificacao("Ana", "(11) 98888-7777", true, true));
    }

    @Test
    public void permiteCamposVaziosQuandoOpcionais() {
        assertEquals(
                AberturaMesaPolicy.ErroIdentificacao.OK,
                AberturaMesaPolicy.validarIdentificacao("", "", false, false));
        assertEquals(
                AberturaMesaPolicy.ErroIdentificacao.OK,
                AberturaMesaPolicy.validarIdentificacao("Ana", "", true, false));
        assertEquals(
                AberturaMesaPolicy.ErroIdentificacao.OK,
                AberturaMesaPolicy.validarIdentificacao("", "(11) 98888-7777", false, true));
    }

    @Test
    public void telefonePreenchidoPrecisaSerValidoMesmoOpcional() {
        assertEquals(
                AberturaMesaPolicy.ErroIdentificacao.TELEFONE_INVALIDO,
                AberturaMesaPolicy.validarIdentificacao("Ana", "(11) 123", false, false));
    }

    @Test
    public void identificacaoAbreQuandoTelefoneOuPalavraChaveEstaoLigados() {
        assertFalse(AberturaMesaPolicy.devePedirIdentificacao(false, false, false, false));
        assertTrue(AberturaMesaPolicy.devePedirIdentificacao(false, true, false, false));
        assertTrue(AberturaMesaPolicy.devePedirIdentificacao(false, false, true, false));
        assertFalse(AberturaMesaPolicy.devePedirIdentificacao(true, true, true, true));
    }

    @Test
    public void palavraChaveExigeTelefoneMesmoComInterruptorDesligado() {
        assertTrue(AberturaMesaPolicy.deveExigirTelefone(false, true));
        assertFalse(AberturaMesaPolicy.deveExigirTelefone(false, false));
        assertFalse(AberturaMesaPolicy.deveExigirNome(false, true));
        assertTrue(AberturaMesaPolicy.deveExigirNome(true, true));
    }
}

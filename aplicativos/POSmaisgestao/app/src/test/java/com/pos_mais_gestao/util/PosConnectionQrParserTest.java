package com.pos_mais_gestao.util;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;

import org.junit.Test;

public class PosConnectionQrParserTest {
    @Test
    public void leQrDeConexaoGeradoPeloPdv() {
        assertEquals(
                "http://192.168.0.42:5050",
                PosConnectionQrParser.parse(
                        "mgpos://connect?v=1&url=http%3A%2F%2F192.168.0.42%3A5050"));
    }

    @Test
    public void rejeitaQrComCredencialOuFormatoDesconhecido() {
        assertThrows(
                IllegalArgumentException.class,
                () -> PosConnectionQrParser.parse(
                        "mgpos://connect?v=1&url=http%3A%2F%2Fuser%3Asecret%40192.168.0.42%3A5050"));
        assertThrows(
                IllegalArgumentException.class,
                () -> PosConnectionQrParser.parse("https://exemplo.com"));
    }
}

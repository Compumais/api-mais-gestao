package com.pos_mais_gestao.hardware;

import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

public class ImpressoraEnderecoTest {
    @Test
    public void leUsbSalva() {
        ImpressoraUsbId id = ImpressoraUsbId.parse("usb:1046:20497:12");
        assertEquals(1046, id.vendorId);
        assertEquals(20497, id.productId);
        assertEquals(12, id.deviceId);
        assertEquals("usb:1046:20497:12", id.formatar());
    }

    @Test
    public void rejeitaUsbIncompleta() {
        assertNull(ImpressoraUsbId.parse("usb:1:2"));
        assertNull(ImpressoraUsbId.parse("bt:1:2:3"));
        assertNull(ImpressoraUsbId.parse(null));
    }

    @Test
    public void leRedeComPorta() {
        ImpressoraRedeEndereco endereco = ImpressoraRedeEndereco.parse("192.168.0.50:9100");
        assertEquals("192.168.0.50", endereco.host);
        assertEquals(9100, endereco.porta);
        assertEquals("192.168.0.50:9100", endereco.formatar());
    }

    @Test
    public void usaPorta9100QuandoSoHaHost() {
        ImpressoraRedeEndereco endereco = ImpressoraRedeEndereco.montar("caixa-01.local", "");
        assertEquals(ImpressoraRedeEndereco.PORTA_PADRAO, endereco.porta);
        assertEquals("caixa-01.local:9100", endereco.formatar());
    }

    @Test
    public void rejeitaRedeInvalida() {
        assertNull(ImpressoraRedeEndereco.parse(""));
        assertNull(ImpressoraRedeEndereco.parse("192.168.0.1:0"));
        assertNull(ImpressoraRedeEndereco.parse("192.168.0.1:70000"));
        assertNull(ImpressoraRedeEndereco.montar("host com espaco", "9100"));
        assertNull(ImpressoraRedeEndereco.montar("10.0.0.8", "abc"));
    }
}

package com.pos_mais_gestao.hardware.balanca;

import android.hardware.usb.UsbDevice;
import com.pos_mais_gestao.domain.balanca.BalancaConfig;
import com.pos_mais_gestao.domain.balanca.DispositivoBalanca;
import java.io.IOException;
import java.util.List;

public interface BalancaTransport {
    List<DispositivoBalanca> listar();

    UsbDevice localizar(BalancaConfig config);

    boolean temPermissao(UsbDevice device);

    void solicitarPermissao(UsbDevice device);

    void abrir(UsbDevice device, BalancaConfig config) throws IOException;

    void escrever(byte[] dados, int timeoutMs) throws IOException;

    int ler(byte[] destino, int timeoutMs) throws IOException;

    boolean estaAberto();

    void fechar();
}

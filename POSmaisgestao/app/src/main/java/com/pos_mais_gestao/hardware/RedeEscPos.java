package com.pos_mais_gestao.hardware;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;

/** Envio ESC/POS em TCP raw (porta padrão 9100). */
public final class RedeEscPos {
    private static final int CONECTAR_MS = 4000;
    private static final int ESCRITA_MS = 8000;

    private RedeEscPos() {}

    public static void enviar(String id, byte[] dados) throws Exception {
        ImpressoraRedeEndereco endereco = ImpressoraRedeEndereco.parse(id);
        if (endereco == null) {
            throw new Exception("Informe o IP e a porta da impressora de rede");
        }
        Socket socket = new Socket();
        try {
            socket.connect(new InetSocketAddress(endereco.host, endereco.porta), CONECTAR_MS);
            socket.setSoTimeout(ESCRITA_MS);
            OutputStream saida = socket.getOutputStream();
            saida.write(dados);
            saida.flush();
        } catch (UnknownHostException error) {
            throw new Exception("Impressora de rede não encontrada: " + endereco.host);
        } catch (SocketTimeoutException error) {
            throw new Exception("Impressora de rede não respondeu em " + endereco.formatar());
        } catch (IOException error) {
            throw new Exception("Falha ao imprimir em " + endereco.formatar());
        } finally {
            try {
                socket.close();
            } catch (IOException ignored) {
            }
        }
    }
}

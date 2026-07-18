package com.pos_mais_gestao.hardware;

import android.content.Context;
import android.util.Log;
import java.nio.charset.Charset;

/**
 * Impressão ESC/POS genérica. Por padrão faz log do cupom;
 * integração Bluetooth/USB do aparelho pode substituir {@link #enviar(byte[])}.
 */
public class EscPosPrinter implements ImpressoraPos {
    private static final String TAG = "EscPosPrinter";
    private static final byte[] INIT = new byte[] {0x1B, 0x40};
    private static final byte[] CUT = new byte[] {0x1D, 0x56, 0x00};

    private final Context context;

    public EscPosPrinter(Context context) {
        this.context = context.getApplicationContext();
    }

    @Override
    public boolean estaDisponivel() {
        return true;
    }

    @Override
    public void imprimirTexto(String texto) throws Exception {
        StringBuilder payload = new StringBuilder();
        payload.append(texto);
        if (!texto.endsWith("\n")) {
            payload.append('\n');
        }
        payload.append("\n\n\n");
        byte[] bytes = payload.toString().getBytes(Charset.forName("IBM437"));
        byte[] full = new byte[INIT.length + bytes.length + CUT.length];
        System.arraycopy(INIT, 0, full, 0, INIT.length);
        System.arraycopy(bytes, 0, full, INIT.length, bytes.length);
        System.arraycopy(CUT, 0, full, INIT.length + bytes.length, CUT.length);
        enviar(full);
    }

    protected void enviar(byte[] dados) {
        // Fallback: registra o cupom. Em aparelhos com impressora, sobrescrever/conectar BT.
        Log.i(TAG, "Comprovante ESC/POS (" + dados.length + " bytes):\n"
                + new String(dados, Charset.forName("IBM437")));
    }
}

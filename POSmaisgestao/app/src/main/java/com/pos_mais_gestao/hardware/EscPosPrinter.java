package com.pos_mais_gestao.hardware;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.util.Log;
import com.pos_mais_gestao.data.local.PrefsStore;
import java.io.OutputStream;
import java.nio.charset.Charset;
import java.util.UUID;

/**
 * Impressão ESC/POS. Envia via Bluetooth SPP quando há impressora selecionada;
 * caso contrário, registra o cupom no log.
 */
public class EscPosPrinter implements ImpressoraPos {
    private static final String TAG = "EscPosPrinter";
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private static final byte[] INIT = new byte[] {0x1B, 0x40};
    private static final byte[] CUT = new byte[] {0x1D, 0x56, 0x00};

    private final Context context;
    private final PrefsStore prefs;

    public EscPosPrinter(Context context) {
        this.context = context.getApplicationContext();
        this.prefs = new PrefsStore(this.context);
    }

    @Override
    public boolean estaDisponivel() {
        String id = prefs.getImpressoraId();
        return id != null && !id.isEmpty();
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

    protected void enviar(byte[] dados) throws Exception {
        String tipo = prefs.getImpressoraTipo();
        String id = prefs.getImpressoraId();
        if (ImpressoraInfo.TIPO_BLUETOOTH.equals(tipo) && id != null && !id.isEmpty()) {
            enviarBluetooth(id, dados);
            return;
        }
        Log.i(TAG, "Comprovante ESC/POS (" + dados.length + " bytes)"
                + (prefs.getImpressoraNome() != null ? " [" + prefs.getImpressoraNome() + "]" : "")
                + ":\n"
                + new String(dados, Charset.forName("IBM437")));
        if (ImpressoraInfo.TIPO_USB.equals(tipo)) {
            throw new Exception("Impressora USB selecionada: conecte o driver do fabricante ou use Bluetooth.");
        }
    }

    private void enviarBluetooth(String mac, byte[] dados) throws Exception {
        if (!ImpressoraDiscovery.temPermissaoBluetooth(context)) {
            throw new Exception("Permissão Bluetooth necessária para imprimir");
        }
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null || !adapter.isEnabled()) {
            throw new Exception("Bluetooth desligado");
        }
        BluetoothDevice device = adapter.getRemoteDevice(mac);
        BluetoothSocket socket = null;
        try {
            socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
            adapter.cancelDiscovery();
            socket.connect();
            OutputStream out = socket.getOutputStream();
            out.write(dados);
            out.flush();
        } finally {
            if (socket != null) {
                try {
                    socket.close();
                } catch (Exception ignored) {
                }
            }
        }
    }
}

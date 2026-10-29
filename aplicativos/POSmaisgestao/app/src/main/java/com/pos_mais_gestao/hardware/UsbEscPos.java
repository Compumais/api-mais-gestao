package com.pos_mais_gestao.hardware;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import java.util.Arrays;

/** Envio ESC/POS pela USB host (classe impressora ou qualquer bulk OUT). */
public final class UsbEscPos {
    public static final String ACTION_USB_PERMISSION =
            "com.pos_mais_gestao.USB_PERMISSION_IMPRESSORA";

    private static final int TIMEOUT_MS = 5000;
    private static final int CHUNK = 4096;

    private UsbEscPos() {}

    public static void enviar(Context context, String id, byte[] dados) throws Exception {
        ImpressoraUsbId alvo = ImpressoraUsbId.parse(id);
        if (alvo == null) {
            throw new Exception("Impressora USB inválida. Selecione o dispositivo de novo.");
        }
        UsbManager usb = usbManager(context);
        if (usb == null) {
            throw new Exception("USB host indisponível neste aparelho");
        }
        UsbDevice device = localizar(usb, alvo);
        if (device == null) {
            throw new Exception("Impressora USB não encontrada. Conecte o cabo e atualize a lista.");
        }
        if (!usb.hasPermission(device)) {
            solicitarPermissao(context, device);
            throw new Exception("Permissão USB da impressora necessária. Conceda e imprima novamente.");
        }
        Saida saida = acharSaida(device);
        if (saida == null) {
            throw new Exception("A USB conectada não tem saída ESC/POS.");
        }
        UsbDeviceConnection conexao = usb.openDevice(device);
        if (conexao == null) {
            throw new Exception("Não foi possível abrir a impressora USB");
        }
        boolean reservada = false;
        try {
            if (!conexao.claimInterface(saida.iface, true)) {
                throw new Exception("Não foi possível reservar a impressora USB");
            }
            reservada = true;
            int offset = 0;
            while (offset < dados.length) {
                int tamanho = Math.min(CHUNK, dados.length - offset);
                byte[] bloco = Arrays.copyOfRange(dados, offset, offset + tamanho);
                int gravados = conexao.bulkTransfer(saida.endpoint, bloco, bloco.length, TIMEOUT_MS);
                if (gravados <= 0) {
                    throw new Exception("A impressora USB não aceitou os dados");
                }
                offset += gravados;
            }
        } finally {
            if (reservada) {
                try {
                    conexao.releaseInterface(saida.iface);
                } catch (Exception ignored) {
                }
            }
            conexao.close();
        }
    }

    public static void solicitarPermissaoSeNecessario(Context context, String id) {
        ImpressoraUsbId alvo = ImpressoraUsbId.parse(id);
        UsbManager usb = usbManager(context);
        if (alvo == null || usb == null) {
            return;
        }
        UsbDevice device = localizar(usb, alvo);
        if (device != null && !usb.hasPermission(device)) {
            solicitarPermissao(context, device);
        }
    }

    static UsbDevice localizar(UsbManager usb, ImpressoraUsbId alvo) {
        UsbDevice mesmoProduto = null;
        for (UsbDevice device : usb.getDeviceList().values()) {
            if (device.getVendorId() != alvo.vendorId || device.getProductId() != alvo.productId) {
                continue;
            }
            if (device.getDeviceId() == alvo.deviceId) {
                return device;
            }
            if (mesmoProduto == null) {
                mesmoProduto = device;
            }
        }
        return mesmoProduto;
    }

    static Saida acharSaida(UsbDevice device) {
        Saida alternativa = null;
        for (int i = 0; i < device.getInterfaceCount(); i++) {
            UsbInterface iface = device.getInterface(i);
            UsbEndpoint out = bulkOut(iface);
            if (out == null) {
                continue;
            }
            Saida saida = new Saida(iface, out);
            if (iface.getInterfaceClass() == UsbConstants.USB_CLASS_PRINTER) {
                return saida;
            }
            if (alternativa == null) {
                alternativa = saida;
            }
        }
        return alternativa;
    }

    private static UsbEndpoint bulkOut(UsbInterface iface) {
        for (int i = 0; i < iface.getEndpointCount(); i++) {
            UsbEndpoint endpoint = iface.getEndpoint(i);
            if (endpoint.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK
                    && endpoint.getDirection() == UsbConstants.USB_DIR_OUT) {
                return endpoint;
            }
        }
        return null;
    }

    private static void solicitarPermissao(Context context, UsbDevice device) {
        UsbManager usb = usbManager(context);
        if (usb == null) {
            return;
        }
        Intent intent = new Intent(context, ImpressoraUsbPermissionReceiver.class)
                .setAction(ACTION_USB_PERMISSION);
        PendingIntent permissao = PendingIntent.getBroadcast(
                context,
                1,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
        usb.requestPermission(device, permissao);
    }

    private static UsbManager usbManager(Context context) {
        return (UsbManager) context.getApplicationContext().getSystemService(Context.USB_SERVICE);
    }

    static final class Saida {
        final UsbInterface iface;
        final UsbEndpoint endpoint;

        Saida(UsbInterface iface, UsbEndpoint endpoint) {
            this.iface = iface;
            this.endpoint = endpoint;
        }
    }
}

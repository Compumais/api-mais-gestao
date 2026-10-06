package com.maisgestao.estacao_balanca

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import java.nio.charset.Charset

/**
 * Envia texto ESC/POS para a impressora USB interna de 48 mm.
 * Se o Android ainda não autorizou o dispositivo, pede a permissão e
 * devolve erro para a estação ficar na tela de reimpressão.
 */
class ImpressoraInterna(private val context: Context) {
    fun imprimir(texto: String) {
        val usb = context.getSystemService(Context.USB_SERVICE) as UsbManager
        val device = acharImpressora(usb)
            ?: throw IllegalStateException("Impressora interna de 48 mm não encontrada.")
        if (!usb.hasPermission(device)) {
            pedirPermissao(usb, device)
            throw IllegalStateException(
                "Autorize a impressora interna e toque em Reimprimir.",
            )
        }
        val connection = usb.openDevice(device)
            ?: throw IllegalStateException("Não foi possível abrir a impressora interna.")
        val iface = (0 until device.interfaceCount)
            .map { device.getInterface(it) }
            .firstOrNull { it.interfaceClass == UsbConstants.USB_CLASS_PRINTER }
            ?: throw IllegalStateException("A impressora interna não expõe porta de impressão.")
        if (!connection.claimInterface(iface, true)) {
            connection.close()
            throw IllegalStateException("A impressora interna está em uso.")
        }
        val endpoint = (0 until iface.endpointCount)
            .map { iface.getEndpoint(it) }
            .firstOrNull {
                it.direction == UsbConstants.USB_DIR_OUT &&
                    it.type == UsbConstants.USB_ENDPOINT_XFER_BULK
            }
        if (endpoint == null) {
            connection.releaseInterface(iface)
            connection.close()
            throw IllegalStateException("A impressora interna não aceita envio de dados.")
        }
        try {
            val payload = montarEscPos(texto)
            var offset = 0
            while (offset < payload.size) {
                val tamanho = minOf(256, payload.size - offset)
                val enviados = connection.bulkTransfer(
                    endpoint,
                    payload,
                    offset,
                    tamanho,
                    4000,
                )
                if (enviados <= 0) {
                    throw IllegalStateException("A impressora interna não recebeu a via.")
                }
                offset += enviados
            }
        } finally {
            connection.releaseInterface(iface)
            connection.close()
        }
    }

    private fun acharImpressora(usb: UsbManager): UsbDevice? {
        return usb.deviceList.values.firstOrNull { device ->
            (0 until device.interfaceCount).any { indice ->
                device.getInterface(indice).interfaceClass == UsbConstants.USB_CLASS_PRINTER
            }
        }
    }

    private fun pedirPermissao(usb: UsbManager, device: UsbDevice) {
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            PendingIntent.FLAG_MUTABLE
        } else {
            0
        }
        val intent = Intent(ACAO_PERMISSAO).setPackage(context.packageName)
        val pending = PendingIntent.getBroadcast(context, 0, intent, flags)
        usb.requestPermission(device, pending)
    }

    private fun montarEscPos(texto: String): ByteArray {
        val corpo = texto.replace("\r\n", "\n").toByteArray(Charset.forName("ISO-8859-1"))
        val inicio = byteArrayOf(0x1B, 0x40)
        val fim = byteArrayOf(0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x00)
        return inicio + corpo + fim
    }

    companion object {
        const val ACAO_PERMISSAO = "com.maisgestao.estacao_balanca.USB_PRINTER"
    }
}

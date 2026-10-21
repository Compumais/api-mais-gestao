package com.pos_mais_gestao.hardware;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Destino explícito do PendingIntent de permissão USB da impressora.
 * A concessão fica no UsbManager; a impressão seguinte só consulta hasPermission.
 */
public final class ImpressoraUsbPermissionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !UsbEscPos.ACTION_USB_PERMISSION.equals(intent.getAction())) {
            return;
        }
    }
}

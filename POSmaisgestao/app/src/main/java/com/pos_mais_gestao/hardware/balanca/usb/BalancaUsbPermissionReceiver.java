package com.pos_mais_gestao.hardware.balanca.usb;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;
import android.os.Build;
import com.pos_mais_gestao.PosApplication;

/** Receiver explícito usado pelo PendingIntent de permissão USB no Android 12+. */
public final class BalancaUsbPermissionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (!UsbSerialBalancaTransport.ACTION_USB_PERMISSION.equals(intent.getAction())) {
            return;
        }
        boolean concedida = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false);
        UsbDevice device = obterDispositivo(intent);
        PosApplication app = (PosApplication) context.getApplicationContext();
        app.getBalancaManager().onPermissaoUsb(device, concedida);
    }

    @SuppressWarnings("deprecation")
    private UsbDevice obterDispositivo(Intent intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice.class);
        }
        return intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
    }
}

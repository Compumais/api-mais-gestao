package com.pos_mais_gestao.hardware;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public final class ImpressoraDiscovery {
    private ImpressoraDiscovery() {}

    public static List<ImpressoraInfo> listar(Context context) {
        List<ImpressoraInfo> lista = new ArrayList<>();
        lista.add(new ImpressoraInfo("", "Nenhuma (apenas log)", ImpressoraInfo.TIPO_NENHUMA));
        lista.addAll(listarBluetooth(context));
        lista.addAll(listarUsb(context));
        return lista;
    }

    public static boolean temPermissaoBluetooth(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return ContextCompat.checkSelfPermission(context, Manifest.permission.BLUETOOTH_CONNECT)
                    == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    private static List<ImpressoraInfo> listarBluetooth(Context context) {
        List<ImpressoraInfo> lista = new ArrayList<>();
        if (!temPermissaoBluetooth(context)) {
            return lista;
        }
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter == null || !adapter.isEnabled()) {
                return lista;
            }
            Set<BluetoothDevice> paired = adapter.getBondedDevices();
            if (paired == null) {
                return lista;
            }
            for (BluetoothDevice device : paired) {
                String nome = device.getName();
                if (nome == null || nome.trim().isEmpty()) {
                    nome = device.getAddress();
                }
                lista.add(new ImpressoraInfo(
                        device.getAddress(),
                        nome + " (Bluetooth)",
                        ImpressoraInfo.TIPO_BLUETOOTH));
            }
        } catch (SecurityException ignored) {
        }
        return lista;
    }

    private static List<ImpressoraInfo> listarUsb(Context context) {
        List<ImpressoraInfo> lista = new ArrayList<>();
        UsbManager usbManager = (UsbManager) context.getSystemService(Context.USB_SERVICE);
        if (usbManager == null) {
            return lista;
        }
        for (UsbDevice device : usbManager.getDeviceList().values()) {
            String nome = nomeUsb(device);
            if (nome == null || nome.trim().isEmpty()) {
                nome = "USB " + device.getDeviceName();
            }
            String id = new ImpressoraUsbId(
                    device.getVendorId(), device.getProductId(), device.getDeviceId()).formatar();
            String sufixo = temClasseImpressora(device) ? " (USB ESC/POS)" : " (USB)";
            lista.add(new ImpressoraInfo(id, nome + sufixo, ImpressoraInfo.TIPO_USB));
        }
        return lista;
    }

    private static String nomeUsb(UsbDevice device) {
        try {
            return device.getProductName();
        } catch (SecurityException error) {
            return null;
        }
    }

    private static boolean temClasseImpressora(UsbDevice device) {
        for (int i = 0; i < device.getInterfaceCount(); i++) {
            UsbInterface iface = device.getInterface(i);
            if (iface.getInterfaceClass() == UsbConstants.USB_CLASS_PRINTER) {
                return true;
            }
        }
        return false;
    }
}

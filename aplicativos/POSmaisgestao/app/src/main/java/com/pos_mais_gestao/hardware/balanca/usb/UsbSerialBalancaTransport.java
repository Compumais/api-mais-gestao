package com.pos_mais_gestao.hardware.balanca.usb;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbManager;
import com.hoho.android.usbserial.driver.UsbSerialDriver;
import com.hoho.android.usbserial.driver.UsbSerialPort;
import com.hoho.android.usbserial.driver.UsbSerialProber;
import com.pos_mais_gestao.domain.balanca.BalancaConfig;
import com.pos_mais_gestao.domain.balanca.DispositivoBalanca;
import com.pos_mais_gestao.hardware.balanca.BalancaTransport;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public final class UsbSerialBalancaTransport implements BalancaTransport {
    public static final String ACTION_USB_PERMISSION =
            "com.pos_mais_gestao.USB_PERMISSION_BALANCA";

    private final Context context;
    private final UsbManager usbManager;
    private UsbDeviceConnection connection;
    private UsbSerialPort port;

    public UsbSerialBalancaTransport(Context context) {
        this.context = context.getApplicationContext();
        this.usbManager = (UsbManager) this.context.getSystemService(Context.USB_SERVICE);
    }

    @Override
    public List<DispositivoBalanca> listar() {
        List<DispositivoBalanca> result = new ArrayList<>();
        for (UsbSerialDriver driver : UsbSerialProber.getDefaultProber().findAllDrivers(usbManager)) {
            UsbDevice device = driver.getDevice();
            result.add(new DispositivoBalanca(
                    device.getVendorId(),
                    device.getProductId(),
                    serialSeguro(device),
                    nomeSeguro(device),
                    driver.getClass().getSimpleName()));
        }
        return result;
    }

    @Override
    public UsbDevice localizar(BalancaConfig config) {
        List<UsbSerialDriver> drivers = UsbSerialProber.getDefaultProber().findAllDrivers(usbManager);
        if (!config.temDispositivoSelecionado() && drivers.size() == 1) {
            return drivers.get(0).getDevice();
        }
        for (UsbSerialDriver driver : drivers) {
            UsbDevice device = driver.getDevice();
            if (device.getVendorId() != config.vendorId || device.getProductId() != config.productId) {
                continue;
            }
            String serial = serialSeguro(device);
            if (config.serial.isEmpty() || serial.isEmpty() || config.serial.equals(serial)) {
                return device;
            }
        }
        return null;
    }

    @Override
    public boolean temPermissao(UsbDevice device) {
        return usbManager.hasPermission(device);
    }

    @Override
    public void solicitarPermissao(UsbDevice device) {
        Intent intent = new Intent(context, BalancaUsbPermissionReceiver.class)
                .setAction(ACTION_USB_PERMISSION);
        PendingIntent permissionIntent = PendingIntent.getBroadcast(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
        usbManager.requestPermission(device, permissionIntent);
    }

    @Override
    public void abrir(UsbDevice device, BalancaConfig config) throws IOException {
        fechar();
        UsbSerialDriver selected = null;
        for (UsbSerialDriver driver : UsbSerialProber.getDefaultProber().findAllDrivers(usbManager)) {
            if (driver.getDevice().getDeviceId() == device.getDeviceId()) {
                selected = driver;
                break;
            }
        }
        if (selected == null || selected.getPorts().isEmpty()) {
            throw new IOException("Conversor USB-Serial não suportado");
        }
        UsbDeviceConnection opened = usbManager.openDevice(device);
        if (opened == null) {
            throw new IOException("Não foi possível abrir o dispositivo USB");
        }
        UsbSerialPort openedPort = selected.getPorts().get(0);
        try {
            openedPort.open(opened);
            openedPort.setParameters(
                    config.baudRate,
                    config.dataBits,
                    config.stopBits,
                    config.parity);
            synchronized (this) {
                connection = opened;
                port = openedPort;
            }
        } catch (Exception error) {
            try {
                openedPort.close();
            } catch (Exception ignored) {
            }
            opened.close();
            throw error instanceof IOException
                    ? (IOException) error
                    : new IOException("Falha ao configurar USB-Serial", error);
        }
    }

    @Override
    public void escrever(byte[] dados, int timeoutMs) throws IOException {
        UsbSerialPort atual;
        synchronized (this) {
            atual = port;
        }
        if (atual == null) {
            throw new IOException("Porta USB-Serial fechada");
        }
        atual.write(dados, timeoutMs);
    }

    @Override
    public int ler(byte[] destino, int timeoutMs) throws IOException {
        UsbSerialPort atual;
        synchronized (this) {
            atual = port;
        }
        if (atual == null) {
            throw new IOException("Porta USB-Serial fechada");
        }
        return atual.read(destino, timeoutMs);
    }

    @Override
    public synchronized boolean estaAberto() {
        return port != null;
    }

    @Override
    public synchronized void fechar() {
        if (port != null) {
            try {
                port.close();
            } catch (Exception ignored) {
            }
        }
        if (connection != null) {
            connection.close();
        }
        port = null;
        connection = null;
    }

    private String serialSeguro(UsbDevice device) {
        try {
            String serial = device.getSerialNumber();
            return serial == null ? "" : serial;
        } catch (SecurityException ignored) {
            return "";
        }
    }

    private String nomeSeguro(UsbDevice device) {
        String nome = device.getProductName();
        if (nome == null || nome.trim().isEmpty()) {
            nome = "Conversor USB-Serial";
        }
        return nome;
    }
}

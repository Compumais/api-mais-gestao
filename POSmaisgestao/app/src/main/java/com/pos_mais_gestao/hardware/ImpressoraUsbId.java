package com.pos_mais_gestao.hardware;

/** Identidade salva de uma impressora USB: `usb:vendorId:productId:deviceId`. */
public final class ImpressoraUsbId {
    public final int vendorId;
    public final int productId;
    public final int deviceId;

    public ImpressoraUsbId(int vendorId, int productId, int deviceId) {
        this.vendorId = vendorId;
        this.productId = productId;
        this.deviceId = deviceId;
    }

    public static ImpressoraUsbId parse(String id) {
        if (id == null || !id.startsWith("usb:")) {
            return null;
        }
        String[] partes = id.split(":");
        if (partes.length != 4) {
            return null;
        }
        try {
            int vendor = Integer.parseInt(partes[1]);
            int product = Integer.parseInt(partes[2]);
            int device = Integer.parseInt(partes[3]);
            if (vendor < 0 || product < 0 || device < 0) {
                return null;
            }
            return new ImpressoraUsbId(vendor, product, device);
        } catch (NumberFormatException error) {
            return null;
        }
    }

    public String formatar() {
        return "usb:" + vendorId + ":" + productId + ":" + deviceId;
    }
}

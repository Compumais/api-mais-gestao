package com.pos_mais_gestao.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Locale;

/**
 * Gera payload PIX "copia e cola" (BR Code estático com valor) conforme EMV QRCPS-MPM.
 */
public final class PixPayloadBuilder {
    private PixPayloadBuilder() {}

    public static String montar(String chavePix, BigDecimal valor, String nomeRecebedor, String cidade) {
        if (chavePix == null || chavePix.trim().isEmpty()) {
            throw new IllegalArgumentException("Chave PIX obrigatória");
        }
        String chave = chavePix.trim();
        String nome = truncar(sanitizar(nomeRecebedor != null ? nomeRecebedor : "RECEBEDOR"), 25);
        String cid = truncar(sanitizar(cidade != null && !cidade.trim().isEmpty() ? cidade : "BRASIL"), 15);
        if (nome.isEmpty()) {
            nome = "RECEBEDOR";
        }
        if (cid.isEmpty()) {
            cid = "BRASIL";
        }

        StringBuilder merchantAccount = new StringBuilder();
        merchantAccount.append(tlv("00", "br.gov.bcb.pix"));
        merchantAccount.append(tlv("01", chave));

        StringBuilder payload = new StringBuilder();
        payload.append(tlv("00", "01"));
        payload.append(tlv("26", merchantAccount.toString()));
        payload.append(tlv("52", "0000"));
        payload.append(tlv("53", "986"));
        if (valor != null && valor.compareTo(BigDecimal.ZERO) > 0) {
            String valorStr = valor.setScale(2, RoundingMode.HALF_UP).toPlainString();
            payload.append(tlv("54", valorStr));
        }
        payload.append(tlv("58", "BR"));
        payload.append(tlv("59", nome));
        payload.append(tlv("60", cid));
        payload.append(tlv("62", tlv("05", "***")));

        String semCrc = payload + "6304";
        String crc = crc16(semCrc);
        return semCrc + crc;
    }

    private static String tlv(String id, String value) {
        String len = String.format(Locale.US, "%02d", value.length());
        return id + len + value;
    }

    private static String sanitizar(String value) {
        StringBuilder sb = new StringBuilder();
        String upper = value.toUpperCase(Locale.ROOT);
        for (int i = 0; i < upper.length(); i++) {
            char c = upper.charAt(i);
            if ((c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == ' ') {
                sb.append(c);
            }
        }
        return sb.toString().trim();
    }

    private static String truncar(String value, int max) {
        if (value.length() <= max) {
            return value;
        }
        return value.substring(0, max);
    }

    /** CRC16-CCITT (polynomial 0x1021), conforme especificação PIX. */
    static String crc16(String payload) {
        int crc = 0xFFFF;
        for (int i = 0; i < payload.length(); i++) {
            crc ^= payload.charAt(i) << 8;
            for (int j = 0; j < 8; j++) {
                if ((crc & 0x8000) != 0) {
                    crc = (crc << 1) ^ 0x1021;
                } else {
                    crc <<= 1;
                }
                crc &= 0xFFFF;
            }
        }
        return String.format(Locale.US, "%04X", crc);
    }
}

package com.pos_mais_gestao.hardware;

import java.io.ByteArrayOutputStream;
import java.nio.charset.Charset;
import java.util.List;

/**
 * Monta bytes ESC/POS de um DANFC-e simplificado (bobina 58/80mm) com QR Code.
 */
public final class DanfceEscPos {
    private static final Charset CHARSET = Charset.forName("IBM437");
    private static final byte[] INIT = new byte[] {0x1B, 0x40};
    private static final byte[] ALIGN_CENTER = new byte[] {0x1B, 0x61, 0x01};
    private static final byte[] ALIGN_LEFT = new byte[] {0x1B, 0x61, 0x00};
    private static final byte[] BOLD_ON = new byte[] {0x1B, 0x45, 0x01};
    private static final byte[] BOLD_OFF = new byte[] {0x1B, 0x45, 0x00};
    private static final byte[] CUT = new byte[] {0x1D, 0x56, 0x00};
    private static final byte[] FEED = new byte[] {0x0A, 0x0A, 0x0A};

    private DanfceEscPos() {}

    public static byte[] montar(
            String empresaNome,
            String dataHora,
            List<String> linhasItens,
            String total,
            List<String> linhasPagamento,
            String chave,
            String protocolo,
            String qrConteudo) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            out.write(INIT);
            out.write(ALIGN_CENTER);
            out.write(BOLD_ON);
            out.write(linha("DOCUMENTO AUXILIAR DA NFC-e"));
            out.write(BOLD_OFF);
            out.write(linha(" "));
            if (empresaNome != null && !empresaNome.isEmpty()) {
                out.write(linha(empresaNome));
            }
            if (dataHora != null && !dataHora.isEmpty()) {
                out.write(linha(dataHora));
            }
            out.write(linha("--------------------------------"));
            out.write(ALIGN_LEFT);
            if (linhasItens != null) {
                for (String item : linhasItens) {
                    out.write(linha(item));
                }
            }
            out.write(linha("--------------------------------"));
            out.write(BOLD_ON);
            out.write(linha("TOTAL R$ " + nullSafe(total)));
            out.write(BOLD_OFF);
            if (linhasPagamento != null) {
                for (String pag : linhasPagamento) {
                    out.write(linha(pag));
                }
            }
            out.write(linha("--------------------------------"));
            out.write(ALIGN_CENTER);
            out.write(linha("CHAVE DE ACESSO"));
            if (chave != null && !chave.isEmpty()) {
                out.write(linha(formatarChave(chave)));
            }
            if (protocolo != null && !protocolo.isEmpty()) {
                out.write(ALIGN_CENTER);
                out.write(linha("Protocolo: " + protocolo));
            }
            String qr = qrConteudo != null ? qrConteudo.trim() : "";
            if (!qr.isEmpty()) {
                out.write(ALIGN_CENTER);
                out.write(linha(" "));
                out.write(qrCode(qr));
                out.write(linha(" "));
                out.write(linha("Consulte pela chave de acesso"));
            }
            out.write(FEED);
            out.write(CUT);
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao montar DANFC-e ESC/POS", e);
        }
        return out.toByteArray();
    }

    /** Monta a partir de um texto já formatado + QR (usado pelo app após montar layout). */
    public static byte[] montarTextoComQr(String texto, String qrConteudo) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            out.write(INIT);
            out.write(ALIGN_LEFT);
            String body = texto == null ? "" : texto;
            if (!body.endsWith("\n")) {
                body = body + "\n";
            }
            out.write(body.getBytes(CHARSET));
            String qr = qrConteudo != null ? qrConteudo.trim() : "";
            if (!qr.isEmpty()) {
                out.write(ALIGN_CENTER);
                out.write(linha(" "));
                out.write(qrCode(qr));
                out.write(linha(" "));
                out.write(linha("Consulte pela chave de acesso"));
            }
            out.write(FEED);
            out.write(CUT);
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao montar cupom ESC/POS", e);
        }
        return out.toByteArray();
    }

    private static byte[] qrCode(String data) throws Exception {
        byte[] content = data.getBytes(Charset.forName("ISO-8859-1"));
        ByteArrayOutputStream qr = new ByteArrayOutputStream();
        // Model 2
        qr.write(new byte[] {0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00});
        // Size module 6
        qr.write(new byte[] {0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06});
        // Error correction M
        qr.write(new byte[] {0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31});
        // Store data
        int storeLen = content.length + 3;
        byte pL = (byte) (storeLen & 0xFF);
        byte pH = (byte) ((storeLen >> 8) & 0xFF);
        qr.write(new byte[] {0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30});
        qr.write(content);
        // Print
        qr.write(new byte[] {0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30});
        return qr.toByteArray();
    }

    private static byte[] linha(String s) {
        return (nullSafe(s) + "\n").getBytes(CHARSET);
    }

    /** Agrupa a chave em blocos de 4 dígitos, quebrando linhas a cada ~11 grupos. */
    public static String formatarChave(String chave) {
        String digits = chave.replaceAll("\\D", "");
        if (digits.isEmpty()) {
            return chave;
        }
        StringBuilder sb = new StringBuilder();
        int gruposNaLinha = 0;
        for (int i = 0; i < digits.length(); i += 4) {
            if (i > 0) {
                if (gruposNaLinha >= 11) {
                    sb.append('\n');
                    gruposNaLinha = 0;
                } else {
                    sb.append(' ');
                }
            }
            sb.append(digits, i, Math.min(i + 4, digits.length()));
            gruposNaLinha++;
        }
        return sb.toString();
    }

    private static String nullSafe(String s) {
        return s == null ? "" : s;
    }
}

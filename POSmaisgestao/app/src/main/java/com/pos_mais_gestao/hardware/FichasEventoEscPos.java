package com.pos_mais_gestao.hardware;

import com.pos_mais_gestao.domain.ItemFicha;
import java.nio.charset.Charset;
import java.util.List;

/** Monta bytes ESC/POS de fichas de evento (uma unidade = um corte). */
public final class FichasEventoEscPos {
    private static final Charset CHARSET = Charset.forName("IBM437");
    private static final byte[] INIT = new byte[] {0x1B, 0x40};
    private static final byte[] ALIGN_CENTER = new byte[] {0x1B, 0x61, 0x01};
    private static final byte[] ALIGN_LEFT = new byte[] {0x1B, 0x61, 0x00};
    private static final byte[] BOLD_ON = new byte[] {0x1B, 0x45, 0x01};
    private static final byte[] BOLD_OFF = new byte[] {0x1B, 0x45, 0x00};
    private static final byte[] SIZE_DOUBLE = new byte[] {0x1D, 0x21, 0x11};
    private static final byte[] SIZE_NORMAL = new byte[] {0x1D, 0x21, 0x00};
    private static final byte[] CUT = new byte[] {0x1D, 0x56, 0x00};
    private static final byte[] FEED = new byte[] {0x0A, 0x0A};

    private FichasEventoEscPos() {}

    public static byte[] montar(
            String empresaNome, String codigoVenda, List<ItemFicha> itens) throws Exception {
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        if (itens == null || itens.isEmpty()) {
            return out.toByteArray();
        }
        for (ItemFicha item : itens) {
            for (int i = 1; i <= item.quantidade; i++) {
                out.write(INIT);
                out.write(ALIGN_CENTER);
                out.write(BOLD_ON);
                out.write(linha("FICHA DE EVENTO"));
                out.write(BOLD_OFF);
                if (empresaNome != null && !empresaNome.isEmpty()) {
                    out.write(linha(empresaNome));
                }
                out.write(linha("--------------------------------"));
                out.write(SIZE_DOUBLE);
                out.write(BOLD_ON);
                out.write(linha(truncar(item.nome, 24)));
                out.write(BOLD_OFF);
                out.write(SIZE_NORMAL);
                out.write(linha(" "));
                out.write(linha(i + " de " + item.quantidade));
                if (codigoVenda != null && !codigoVenda.isEmpty()) {
                    out.write(linha("Venda: " + codigoVenda));
                }
                out.write(linha("--------------------------------"));
                out.write(linha("Apresente para retirar"));
                out.write(FEED);
                out.write(CUT);
            }
        }
        return out.toByteArray();
    }

    private static byte[] linha(String s) {
        return ((s == null ? "" : s) + "\n").getBytes(CHARSET);
    }

    private static String truncar(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max);
    }
}

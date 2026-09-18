package com.pos_mais_gestao.hardware.balanca.protocol;

import com.pos_mais_gestao.domain.balanca.BalancaEstado;
import com.pos_mais_gestao.domain.balanca.BalancaLeitura;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/** Parser incremental do Prt3: STX + cinco caracteres ASCII + ETX. */
public final class Prt3Parser {
    private static final int PAYLOAD_SIZE = 5;
    private static final int MAX_FRAME_SIZE = 32;
    private final ByteArrayOutputStream frame = new ByteArrayOutputStream();
    private boolean recebendo;

    public synchronized List<BalancaLeitura> aceitar(byte[] dados, int tamanho) {
        List<BalancaLeitura> leituras = new ArrayList<>();
        if (dados == null || tamanho <= 0) {
            return leituras;
        }
        int limite = Math.min(tamanho, dados.length);
        for (int i = 0; i < limite; i++) {
            byte atual = dados[i];
            if (atual == Prt3Protocol.STX) {
                frame.reset();
                recebendo = true;
                continue;
            }
            if (!recebendo) {
                continue;
            }
            if (atual == Prt3Protocol.ETX) {
                leituras.add(parsearFrame(frame.toByteArray()));
                frame.reset();
                recebendo = false;
                continue;
            }
            if (frame.size() >= MAX_FRAME_SIZE) {
                frame.reset();
                recebendo = false;
                leituras.add(BalancaLeitura.estado(BalancaEstado.ERRO, "Frame Prt3 excedeu o limite"));
                continue;
            }
            frame.write(atual);
        }
        return leituras;
    }

    public synchronized void resetar() {
        frame.reset();
        recebendo = false;
    }

    public static BalancaLeitura parsearFrame(byte[] payload) {
        if (payload == null || payload.length != PAYLOAD_SIZE) {
            return BalancaLeitura.estado(BalancaEstado.ERRO, "Frame Prt3 incompleto");
        }
        String valor = new String(payload, StandardCharsets.US_ASCII);
        if ("IIIII".equals(valor)) {
            return BalancaLeitura.estado(BalancaEstado.INSTAVEL, "Peso instável");
        }
        if ("NNNNN".equals(valor)) {
            return BalancaLeitura.estado(BalancaEstado.PESO_NEGATIVO, "Peso negativo");
        }
        if ("SSSSS".equals(valor)) {
            return BalancaLeitura.estado(BalancaEstado.SOBRECARGA, "Sobrecarga da balança");
        }
        if (!valor.matches("\\d{5}")) {
            return BalancaLeitura.estado(BalancaEstado.ERRO, "Caracteres inválidos no frame Prt3");
        }
        BigDecimal kg = new BigDecimal(valor).movePointLeft(3).setScale(3, RoundingMode.UNNECESSARY);
        return BalancaLeitura.peso(kg);
    }
}

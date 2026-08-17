package com.pos_mais_gestao.domain;

import com.google.gson.JsonObject;
import java.math.BigDecimal;
import java.math.RoundingMode;

/** Lançamento de pagamento (mesmo contrato da LAN API do PDV). */
public class LancamentoPagamento {
    public static final String STATUS_OK = "ok";
    public static final String STATUS_PENDENTE = "pendente";
    public static final String STATUS_CANCELADO = "cancelado";

    public String id;
    public MeioPagamento meio;
    public BigDecimal valor = BigDecimal.ZERO;
    public String nsu;
    public String autorizacao;
    public String bandeira;
    public String status = STATUS_OK;

    public static LancamentoPagamento ok(MeioPagamento meio, BigDecimal valor) {
        LancamentoPagamento item = new LancamentoPagamento();
        item.meio = meio;
        item.valor = arredondar(valor);
        item.status = STATUS_OK;
        return item;
    }

    public boolean isOk() {
        return status == null || STATUS_OK.equals(status);
    }

    public boolean isPendente() {
        return STATUS_PENDENTE.equals(status);
    }

    public JsonObject toJson() {
        JsonObject json = new JsonObject();
        if (id != null && !id.trim().isEmpty()) {
            json.addProperty("id", id.trim());
        }
        json.addProperty("meio", meio != null ? meio.name() : MeioPagamento.DINHEIRO.name());
        json.addProperty("valor", arredondar(valor).doubleValue());
        if (nsu != null && !nsu.trim().isEmpty()) {
            json.addProperty("nsu", nsu.trim());
        }
        if (autorizacao != null && !autorizacao.trim().isEmpty()) {
            json.addProperty("autorizacao", autorizacao.trim());
        }
        if (bandeira != null && !bandeira.trim().isEmpty()) {
            json.addProperty("bandeira", bandeira.trim());
        }
        json.addProperty("status", status != null ? status : STATUS_OK);
        return json;
    }

    public static BigDecimal arredondar(BigDecimal valor) {
        if (valor == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return valor.setScale(2, RoundingMode.HALF_UP);
    }
}

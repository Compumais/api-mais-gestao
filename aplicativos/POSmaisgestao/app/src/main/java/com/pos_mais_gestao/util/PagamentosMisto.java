package com.pos_mais_gestao.util;

import com.google.gson.JsonArray;
import com.pos_mais_gestao.domain.LancamentoPagamento;
import com.pos_mais_gestao.domain.MeioPagamento;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** Regras de pagamento misto: só `ok` soma; `pendente` bloqueia; troco só em dinheiro. */
public final class PagamentosMisto {
    private PagamentosMisto() {}

    public static class Totais {
        public BigDecimal dinheiro = BigDecimal.ZERO;
        public BigDecimal pix = BigDecimal.ZERO;
        public BigDecimal cartao = BigDecimal.ZERO;
    }

    public static class ResultadoFechamento {
        public final List<LancamentoPagamento> efetivos;
        public final Totais totais;
        public final BigDecimal troco;
        public final BigDecimal soma;

        ResultadoFechamento(
                List<LancamentoPagamento> efetivos,
                Totais totais,
                BigDecimal troco,
                BigDecimal soma) {
            this.efetivos = efetivos;
            this.totais = totais;
            this.troco = troco;
            this.soma = soma;
        }
    }

    public static List<LancamentoPagamento> efetivos(List<LancamentoPagamento> lancamentos) {
        List<LancamentoPagamento> ok = new ArrayList<>();
        if (lancamentos == null) {
            return ok;
        }
        for (LancamentoPagamento item : lancamentos) {
            if (item != null && item.isOk() && item.valor != null
                    && item.valor.compareTo(BigDecimal.ZERO) > 0) {
                ok.add(item);
            }
        }
        return ok;
    }

    public static BigDecimal somarOk(List<LancamentoPagamento> lancamentos) {
        BigDecimal soma = BigDecimal.ZERO;
        for (LancamentoPagamento item : efetivos(lancamentos)) {
            soma = soma.add(LancamentoPagamento.arredondar(item.valor));
        }
        return LancamentoPagamento.arredondar(soma);
    }

    public static BigDecimal restante(BigDecimal total, List<LancamentoPagamento> lancamentos) {
        BigDecimal rest = LancamentoPagamento.arredondar(total).subtract(somarOk(lancamentos));
        if (rest.compareTo(BigDecimal.ZERO) < 0) {
            return BigDecimal.ZERO.setScale(2);
        }
        return LancamentoPagamento.arredondar(rest);
    }

    public static BigDecimal troco(BigDecimal total, List<LancamentoPagamento> lancamentos) {
        BigDecimal extra = somarOk(lancamentos).subtract(LancamentoPagamento.arredondar(total));
        if (extra.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(2);
        }
        return LancamentoPagamento.arredondar(extra);
    }

    public static boolean temPendente(List<LancamentoPagamento> lancamentos) {
        if (lancamentos == null) {
            return false;
        }
        for (LancamentoPagamento item : lancamentos) {
            if (item != null && item.isPendente()) {
                return true;
            }
        }
        return false;
    }

    public static boolean temDinheiroOk(List<LancamentoPagamento> lancamentos) {
        for (LancamentoPagamento item : efetivos(lancamentos)) {
            if (item.meio == MeioPagamento.DINHEIRO) {
                return true;
            }
        }
        return false;
    }

    public static boolean podeFechar(BigDecimal total, List<LancamentoPagamento> lancamentos) {
        try {
            validarFechamento(total, lancamentos, null);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    public static ResultadoFechamento validarFechamento(
            BigDecimal total,
            List<LancamentoPagamento> lancamentos,
            BigDecimal trocoInformado) {
        BigDecimal totalOk = LancamentoPagamento.arredondar(total);
        if (totalOk.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Total da venda inválido");
        }
        if (lancamentos == null || lancamentos.isEmpty()) {
            throw new IllegalArgumentException("Informe ao menos um lançamento de pagamento");
        }
        if (temPendente(lancamentos)) {
            throw new IllegalArgumentException(
                    "Há pagamento pendente; finalize ou cancele antes de fechar");
        }
        List<LancamentoPagamento> ok = efetivos(lancamentos);
        if (ok.isEmpty()) {
            throw new IllegalArgumentException("Informe ao menos um lançamento de pagamento");
        }
        BigDecimal soma = somarOk(ok);
        if (soma.compareTo(totalOk) < 0) {
            throw new IllegalArgumentException(
                    "Pagamento insuficiente: " + soma.toPlainString()
                            + " de " + totalOk.toPlainString());
        }
        Totais totais = totais(ok);
        BigDecimal trocoCalculado = troco(totalOk, ok);
        BigDecimal troco = trocoInformado != null
                && trocoInformado.compareTo(BigDecimal.ZERO) > 0
                ? LancamentoPagamento.arredondar(trocoInformado)
                : trocoCalculado;
        if (troco.compareTo(BigDecimal.ZERO) > 0 && totais.dinheiro.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Troco só é permitido em dinheiro");
        }
        return new ResultadoFechamento(ok, totais, troco, soma);
    }

    public static Totais totais(List<LancamentoPagamento> lancamentos) {
        Totais totais = new Totais();
        for (LancamentoPagamento item : efetivos(lancamentos)) {
            BigDecimal valor = LancamentoPagamento.arredondar(item.valor);
            if (item.meio == MeioPagamento.DINHEIRO) {
                totais.dinheiro = LancamentoPagamento.arredondar(totais.dinheiro.add(valor));
            } else if (item.meio == MeioPagamento.PIX) {
                totais.pix = LancamentoPagamento.arredondar(totais.pix.add(valor));
            } else {
                totais.cartao = LancamentoPagamento.arredondar(totais.cartao.add(valor));
            }
        }
        return totais;
    }

    public static MeioPagamento meioPrincipal(List<LancamentoPagamento> lancamentos) {
        Set<MeioPagamento> meios = new LinkedHashSet<>();
        for (LancamentoPagamento item : efetivos(lancamentos)) {
            if (item.meio != null) {
                meios.add(item.meio);
            }
        }
        if (meios.size() == 1) {
            return meios.iterator().next();
        }
        return MeioPagamento.DINHEIRO;
    }

    public static String rotulo(List<LancamentoPagamento> lancamentos) {
        Set<MeioPagamento> meios = new LinkedHashSet<>();
        for (LancamentoPagamento item : efetivos(lancamentos)) {
            if (item.meio != null) {
                meios.add(item.meio);
            }
        }
        if (meios.isEmpty()) {
            return MeioPagamento.DINHEIRO.name();
        }
        StringBuilder sb = new StringBuilder();
        for (MeioPagamento meio : meios) {
            if (sb.length() > 0) {
                sb.append(" + ");
            }
            sb.append(meio.name());
        }
        return sb.toString();
    }

    public static JsonArray toJsonArray(List<LancamentoPagamento> lancamentos) {
        JsonArray arr = new JsonArray();
        if (lancamentos == null) {
            return arr;
        }
        for (LancamentoPagamento item : lancamentos) {
            if (item != null) {
                arr.add(item.toJson());
            }
        }
        return arr;
    }

    public static boolean valorExcedeRestante(
            MeioPagamento meio, BigDecimal valor, BigDecimal restante) {
        if (meio == MeioPagamento.DINHEIRO) {
            return false;
        }
        return LancamentoPagamento.arredondar(valor)
                .compareTo(LancamentoPagamento.arredondar(restante)) > 0;
    }
}

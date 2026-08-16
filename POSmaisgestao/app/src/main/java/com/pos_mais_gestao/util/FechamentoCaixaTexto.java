package com.pos_mais_gestao.util;

import com.pos_mais_gestao.domain.ResumoTurnoCaixa;
import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public final class FechamentoCaixaTexto {
    private FechamentoCaixaTexto() {}

    public static String montar(
            String empresaNome,
            int numeropdv,
            ResumoTurnoCaixa resumo,
            BigDecimal saldoInformado,
            String observacao) {
        StringBuilder sb = new StringBuilder();
        SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.forLanguageTag("pt-BR"));

        sb.append("MAIS GESTAO - POS\n");
        sb.append("FECHAMENTO DE CAIXA\n");
        sb.append("------------------------------\n");
        if (empresaNome != null && !empresaNome.trim().isEmpty()) {
            sb.append(empresaNome.trim()).append("\n");
        }
        sb.append("PDV: ").append(numeropdv).append("\n");
        sb.append("Data: ").append(sdf.format(new Date())).append("\n");
        sb.append("------------------------------\n");

        if (resumo == null) {
            sb.append("Resumo indisponivel\n");
            return sb.toString();
        }

        sb.append("Suprimento inicial:\n");
        sb.append(MoneyFormat.format(resumo.suprimento)).append("\n\n");

        sb.append("Total vendido:\n");
        sb.append(MoneyFormat.format(resumo.totalVendas)).append("\n");
        sb.append("(").append(resumo.qtdVendas).append(
                resumo.qtdVendas == 1 ? " venda)\n\n" : " vendas)\n\n");

        sb.append("MEIOS DE PAGAMENTO\n");
        sb.append("Dinheiro: ").append(MoneyFormat.format(resumo.pagamentos.dinheiro)).append("\n");
        sb.append("Cartao:   ").append(MoneyFormat.format(resumo.pagamentos.cartao)).append("\n");
        sb.append("PIX:      ").append(MoneyFormat.format(resumo.pagamentos.pix)).append("\n");
        sb.append("Pre-pago: ").append(MoneyFormat.format(resumo.pagamentos.prepago)).append("\n");
        sb.append("------------------------------\n");

        sb.append("Saldo gaveta (esperado):\n");
        sb.append(MoneyFormat.format(resumo.saldoCaixaFisico)).append("\n");
        sb.append("(suprimento + dinheiro)\n\n");

        BigDecimal informado = saldoInformado != null ? saldoInformado : BigDecimal.ZERO;
        sb.append("Saldo informado:\n");
        sb.append(MoneyFormat.format(informado)).append("\n");

        BigDecimal diferenca = informado.subtract(resumo.saldoCaixaFisico);
        if (diferenca.compareTo(BigDecimal.ZERO) == 0) {
            sb.append("Caixa conferido\n");
        } else if (diferenca.compareTo(BigDecimal.ZERO) > 0) {
            sb.append("Sobra: ").append(MoneyFormat.format(diferenca)).append("\n");
        } else {
            sb.append("Falta: ").append(MoneyFormat.format(diferenca.negate())).append("\n");
        }

        if (observacao != null && !observacao.trim().isEmpty()) {
            sb.append("\nObs: ").append(observacao.trim()).append("\n");
        }

        sb.append("------------------------------\n");
        sb.append("\n\n");
        return sb.toString();
    }
}

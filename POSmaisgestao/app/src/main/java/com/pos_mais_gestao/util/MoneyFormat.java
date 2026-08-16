package com.pos_mais_gestao.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.util.Locale;

public final class MoneyFormat {
    private static final NumberFormat BRL =
            NumberFormat.getCurrencyInstance(Locale.forLanguageTag("pt-BR"));

    private MoneyFormat() {}

    public static String format(BigDecimal value) {
        if (value == null) {
            value = BigDecimal.ZERO;
        }
        return BRL.format(value);
    }

    public static BigDecimal parse(String value) {
        if (value == null || value.trim().isEmpty()) {
            return BigDecimal.ZERO;
        }
        String limpo = value.trim()
                .replace("R$", "")
                .replace(" ", "")
                .replace("\u00a0", "");
        // 1.234,56 → 1234.56 | 10,50 → 10.50 | 10.50 → 10.50
        if (limpo.contains(",") && limpo.contains(".")) {
            limpo = limpo.replace(".", "").replace(",", ".");
        } else {
            limpo = limpo.replace(",", ".");
        }
        limpo = limpo.replaceAll("[^0-9.\\-]", "");
        if (limpo.isEmpty() || "-".equals(limpo) || ".".equals(limpo)) {
            return BigDecimal.ZERO;
        }
        try {
            return new BigDecimal(limpo).setScale(2, RoundingMode.HALF_UP);
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    public static String toApi(BigDecimal value) {
        if (value == null) {
            return "0.00";
        }
        return value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }
}

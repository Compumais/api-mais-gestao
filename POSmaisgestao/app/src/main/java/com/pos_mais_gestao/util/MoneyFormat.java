package com.pos_mais_gestao.util;

import java.math.BigDecimal;
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
}

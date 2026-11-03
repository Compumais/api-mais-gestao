package com.maisgestao.nfe.util;

public final class DocumentosBrasil {
    private DocumentosBrasil() {}

    public static String somenteDigitos(String valor) {
        if (valor == null) {
            return "";
        }
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < valor.length(); i++) {
            char c = valor.charAt(i);
            if (c >= '0' && c <= '9') {
                out.append(c);
            }
        }
        return out.toString();
    }

    public static boolean validarCpfCnpj(String documento) {
        String numeros = somenteDigitos(documento);
        if (numeros.length() == 11) {
            return validarCpf(numeros);
        }
        if (numeros.length() == 14) {
            return validarCnpj(numeros);
        }
        return false;
    }

    private static boolean validarCpf(String numeros) {
        if (numeros.length() != 11 || numeros.matches("(\\d)\\1{10}")) {
            return false;
        }
        int digito1 = calcularDigitoCpf(numeros.substring(0, 9), 10);
        int digito2 = calcularDigitoCpf(numeros.substring(0, 10), 11);
        return digito1 == Character.getNumericValue(numeros.charAt(9))
                && digito2 == Character.getNumericValue(numeros.charAt(10));
    }

    private static int calcularDigitoCpf(String base, int fator) {
        int total = 0;
        for (int i = 0; i < base.length(); i++) {
            total += Character.getNumericValue(base.charAt(i)) * (fator - i);
        }
        int resto = (total * 10) % 11;
        return resto == 10 ? 0 : resto;
    }

    private static boolean validarCnpj(String numeros) {
        if (numeros.length() != 14 || numeros.matches("(\\d)\\1{13}")) {
            return false;
        }
        int digito1 = calcularDigitoCnpj(numeros.substring(0, 12));
        int digito2 = calcularDigitoCnpj(numeros.substring(0, 13));
        return digito1 == Character.getNumericValue(numeros.charAt(12))
                && digito2 == Character.getNumericValue(numeros.charAt(13));
    }

    private static int calcularDigitoCnpj(String base) {
        int[] pesos = base.length() == 12
                ? new int[] {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}
                : new int[] {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int total = 0;
        for (int i = 0; i < pesos.length; i++) {
            total += Character.getNumericValue(base.charAt(i)) * pesos[i];
        }
        int resto = total % 11;
        return resto < 2 ? 0 : 11 - resto;
    }
}

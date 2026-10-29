package com.pos_mais_gestao.util;

import android.text.Editable;
import android.text.TextWatcher;
import android.widget.EditText;

/** Máscara e validação de telefone brasileiro: (00) 0000-0000 ou (00) 00000-0000. */
public final class TelefoneBrasil {
    private TelefoneBrasil() {}

    public static String apenasDigitos(String valor) {
        if (valor == null || valor.isEmpty()) {
            return "";
        }
        return valor.replaceAll("\\D", "");
    }

    public static String formatar(String valor) {
        String digitos = apenasDigitos(valor);
        if (digitos.length() > 11) {
            digitos = digitos.substring(0, 11);
        }
        if (digitos.isEmpty()) {
            return "";
        }
        if (digitos.length() <= 2) {
            return "(" + digitos;
        }
        String ddd = digitos.substring(0, 2);
        String resto = digitos.substring(2);
        if (resto.length() <= 4) {
            return "(" + ddd + ") " + resto;
        }
        if (resto.length() <= 8) {
            return "(" + ddd + ") " + resto.substring(0, 4) + "-" + resto.substring(4);
        }
        return "(" + ddd + ") " + resto.substring(0, 5) + "-" + resto.substring(5);
    }

    public static boolean valido(String valor) {
        int n = apenasDigitos(valor).length();
        return n == 10 || n == 11;
    }

    /** Nome genérico legado não conta como identificação. */
    public static String nomeInformado(String valor) {
        if (valor == null) {
            return "";
        }
        String nome = valor.trim();
        if (nome.isEmpty() || "Cliente".equalsIgnoreCase(nome)) {
            return "";
        }
        return nome;
    }

    public static void aplicarMascara(EditText campo) {
        if (campo == null) {
            return;
        }
        campo.addTextChangedListener(new TextWatcher() {
            private boolean atualizando;

            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {}

            @Override
            public void afterTextChanged(Editable s) {
                if (atualizando) {
                    return;
                }
                atualizando = true;
                String formatado = formatar(s.toString());
                if (!formatado.equals(s.toString())) {
                    s.replace(0, s.length(), formatado);
                }
                atualizando = false;
            }
        });
    }
}

package com.pos_mais_gestao.util;

import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.KeyEvent;
import android.view.inputmethod.EditorInfo;
import android.widget.EditText;

/** Campo invisível que recebe o scanner HID (teclado) e entrega o código ao concluir. */
public final class CampoCodigoOculto {
    public interface Listener {
        void onCodigo(String codigo);
    }

    private final EditText campo;
    private final EditText busca;
    private final Listener listener;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable pausa;

    private CampoCodigoOculto(EditText campo, EditText busca, Listener listener) {
        this.campo = campo;
        this.busca = busca;
        this.listener = listener;
    }

    public static CampoCodigoOculto ligar(EditText campo, EditText busca, Listener listener) {
        CampoCodigoOculto captura = new CampoCodigoOculto(campo, busca, listener);
        captura.instalar();
        return captura;
    }

    public void focar() {
        campo.setText("");
        campo.requestFocus();
    }

    private void instalar() {
        campo.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_DONE
                    || actionId == EditorInfo.IME_ACTION_GO
                    || actionId == EditorInfo.IME_ACTION_SEARCH
                    || (event != null && event.getKeyCode() == KeyEvent.KEYCODE_ENTER)) {
                entregar(campo.getText() == null ? "" : campo.getText().toString());
                return true;
            }
            return false;
        });
        campo.setOnKeyListener((v, keyCode, event) -> {
            if (keyCode == KeyEvent.KEYCODE_ENTER && event.getAction() == KeyEvent.ACTION_DOWN) {
                entregar(campo.getText() == null ? "" : campo.getText().toString());
                return true;
            }
            return false;
        });
        campo.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                String texto = s == null ? "" : s.toString();
                if (texto.indexOf('\n') >= 0 || texto.indexOf('\r') >= 0) {
                    entregar(texto);
                    return;
                }
                agendarPausa(texto);
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });
        if (busca != null) {
            busca.setOnKeyListener((v, keyCode, event) -> {
                if (keyCode == KeyEvent.KEYCODE_ENTER && event.getAction() == KeyEvent.ACTION_DOWN) {
                    entregar(busca.getText() == null ? "" : busca.getText().toString());
                    return true;
                }
                return false;
            });
        }
        campo.post(this::focar);
    }

    private void agendarPausa(String texto) {
        if (pausa != null) {
            handler.removeCallbacks(pausa);
        }
        String digitos = texto.replaceAll("\\D", "");
        if (digitos.length() < 8 || !digitos.equals(texto.trim())) {
            return;
        }
        pausa = () -> entregar(texto);
        handler.postDelayed(pausa, 150);
    }

    private void entregar(String bruto) {
        if (pausa != null) {
            handler.removeCallbacks(pausa);
        }
        String codigo = bruto == null ? "" : bruto.replace("\n", "").replace("\r", "").trim();
        campo.setText("");
        if (busca != null && busca.getText() != null && codigo.equals(busca.getText().toString().trim())) {
            busca.setText("");
        }
        campo.post(campo::requestFocus);
        if (codigo.length() >= 3) {
            listener.onCodigo(codigo);
        }
    }
}

package com.pos_mais_gestao.util;

import android.content.Context;
import android.view.LayoutInflater;
import androidx.appcompat.app.AlertDialog;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;
import com.pos_mais_gestao.R;
import java.math.BigDecimal;

/** Diálogo numérico compartilhado pelos fluxos de venda por quilograma. */
public final class QuantidadeProdutoDialog {
    public interface Listener {
        void onQuantidade(BigDecimal quantidade);
    }

    private QuantidadeProdutoDialog() {}

    public static void mostrar(Context context, Listener listener) {
        android.view.View view =
                LayoutInflater.from(context).inflate(R.layout.dialog_valor, null);
        TextInputLayout layout = view.findViewById(R.id.layoutValor);
        TextInputEditText input = view.findViewById(R.id.inputValor);
        layout.setHint(context.getString(R.string.peso_quantidade_kg));
        input.setText("");

        AlertDialog dialog = new AlertDialog.Builder(context)
                .setTitle(R.string.informar_peso)
                .setView(view)
                .setNegativeButton(R.string.cancelar, null)
                .setPositiveButton(R.string.adicionar, null)
                .create();
        dialog.setOnShowListener(ignored -> {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
                String texto = input.getText() == null ? "" : input.getText().toString();
                BigDecimal quantidade = ProdutoQuantidade.normalizar(texto);
                if (quantidade == null) {
                    layout.setError(context.getString(R.string.peso_quantidade_invalido));
                    return;
                }
                layout.setError(null);
                listener.onQuantidade(quantidade);
                dialog.dismiss();
            });
            input.requestFocus();
        });
        dialog.show();
    }
}

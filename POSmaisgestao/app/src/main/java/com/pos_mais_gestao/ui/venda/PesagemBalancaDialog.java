package com.pos_mais_gestao.ui.venda;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.TextView;
import androidx.appcompat.app.AlertDialog;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.domain.Produto;
import com.pos_mais_gestao.domain.balanca.BalancaDiagnostico;
import com.pos_mais_gestao.domain.balanca.BalancaLeitura;
import com.pos_mais_gestao.domain.balanca.SessaoPesagem;
import com.pos_mais_gestao.hardware.balanca.BalancaManager;
import com.pos_mais_gestao.util.ProdutoQuantidade;
import java.math.BigDecimal;
import java.util.function.Consumer;

final class PesagemBalancaDialog {
    private static final long INTERVALO_LEITURA_MS = 400;

    private PesagemBalancaDialog() {}

    static void mostrar(
            Activity activity,
            Produto produto,
            BalancaManager manager,
            Consumer<BigDecimal> aoPesar,
            Runnable entradaManual,
            Runnable aoEncerrar) {
        View view = LayoutInflater.from(activity).inflate(R.layout.dialog_pesagem_balanca, null);
        TextView txtProduto = view.findViewById(R.id.txtPesagemProduto);
        TextView txtPeso = view.findViewById(R.id.txtPesagemPeso);
        TextView txtStatus = view.findViewById(R.id.txtPesagemStatus);
        txtProduto.setText(produto.getDescricao());

        Handler handler = new Handler(Looper.getMainLooper());
        SessaoPesagem sessao = new SessaoPesagem();
        boolean[] ativa = {true};
        AlertDialog[] dialogRef = new AlertDialog[1];

        BalancaManager.Listener listener = diagnostico -> {
            if (ativa[0]) {
                atualizarStatus(activity, diagnostico, txtStatus);
            }
        };

        Runnable[] polling = new Runnable[1];
        polling[0] = () -> {
            if (!ativa[0] || sessao.isConcluida()) {
                return;
            }
            manager.solicitarPeso(leitura -> {
                if (!ativa[0]) {
                    return;
                }
                atualizarLeitura(activity, leitura, txtPeso, txtStatus);
                BigDecimal peso = sessao.consumir(leitura);
                if (peso != null) {
                    ativa[0] = false;
                    handler.removeCallbacksAndMessages(null);
                    manager.removerListener(listener);
                    if (dialogRef[0] != null) {
                        dialogRef[0].dismiss();
                    }
                    aoPesar.accept(peso);
                    return;
                }
                handler.postDelayed(polling[0], INTERVALO_LEITURA_MS);
            });
        };

        AlertDialog dialog = new AlertDialog.Builder(activity)
                .setTitle(R.string.balanca_pesagem_titulo)
                .setView(view)
                .setNegativeButton(android.R.string.cancel, null)
                .setPositiveButton(R.string.digitar_peso, (d, which) -> {
                    ativa[0] = false;
                    handler.removeCallbacksAndMessages(null);
                    manager.removerListener(listener);
                    entradaManual.run();
                })
                .create();
        dialogRef[0] = dialog;
        dialog.setOnDismissListener(d -> {
            ativa[0] = false;
            handler.removeCallbacksAndMessages(null);
            manager.removerListener(listener);
            aoEncerrar.run();
        });
        manager.adicionarListener(listener);
        dialog.show();
        handler.post(polling[0]);
    }

    private static void atualizarStatus(
            Activity activity, BalancaDiagnostico diagnostico, TextView txtStatus) {
        txtStatus.setText(diagnostico.mensagem);
        if (!diagnostico.ultimoPeso.isEmpty()) {
            txtStatus.setContentDescription(activity.getString(
                    R.string.balanca_ultimo_peso,
                    diagnostico.ultimoPeso));
        }
    }

    private static void atualizarLeitura(
            Activity activity,
            BalancaLeitura leitura,
            TextView txtPeso,
            TextView txtStatus) {
        if (leitura.getPesoKg() != null) {
            txtPeso.setText(activity.getString(
                    R.string.balanca_peso_kg,
                    ProdutoQuantidade.exibir(leitura.getPesoKg())));
        }
        txtStatus.setText(leitura.getMensagem());
    }
}

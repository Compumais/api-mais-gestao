package com.pos_mais_gestao.ui.sucesso;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.hardware.ImpressoraPos;
import com.pos_mais_gestao.ui.mesas.MesasActivity;
import com.pos_mais_gestao.ui.venda.VendaActivity;

public class SucessoActivity extends AppCompatActivity {
    public static final String EXTRA_CODIGO = "codigo_pedido";
    public static final String EXTRA_NFCE = "nfce_status";
    public static final String EXTRA_COMPROVANTE = "comprovante";
    public static final String EXTRA_CUPOM_FISCAL = "cupom_fiscal";
    public static final String EXTRA_QR = "qr_conteudo";
    public static final String EXTRA_TITULO = "titulo";
    public static final String EXTRA_VOLTAR_MESAS = "voltar_mesas";

    private String comprovante;
    private String qrConteudo;
    private boolean cupomFiscal;
    private boolean voltarMesas;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_sucesso);

        String codigo = getIntent().getStringExtra(EXTRA_CODIGO);
        String nfce = getIntent().getStringExtra(EXTRA_NFCE);
        String titulo = getIntent().getStringExtra(EXTRA_TITULO);
        comprovante = getIntent().getStringExtra(EXTRA_COMPROVANTE);
        qrConteudo = getIntent().getStringExtra(EXTRA_QR);
        cupomFiscal = getIntent().getBooleanExtra(EXTRA_CUPOM_FISCAL, false);
        voltarMesas = getIntent().getBooleanExtra(EXTRA_VOLTAR_MESAS, false);

        TextView txtTitulo = findViewById(R.id.txtTituloSucesso);
        if (titulo != null && !titulo.isEmpty()) {
            txtTitulo.setText(titulo);
        }

        TextView txtCodigo = findViewById(R.id.txtCodigoPedido);
        txtCodigo.setText(getString(R.string.codigo_pedido, codigo != null ? codigo : "—"));

        TextView txtNfce = findViewById(R.id.txtNfceStatus);
        txtNfce.setText(nfce != null ? nfce : "");

        MaterialButton btnImprimir = findViewById(R.id.btnImprimir);
        btnImprimir.setText(cupomFiscal
                ? R.string.reimprimir_danfce
                : R.string.imprimir_comprovante);
        btnImprimir.setOnClickListener(v -> imprimir());
        if (comprovante == null || comprovante.isEmpty()) {
            btnImprimir.setEnabled(false);
        }

        MaterialButton btnNova = findViewById(R.id.btnNovaVenda);
        btnNova.setText(voltarMesas ? R.string.voltar_mesas : R.string.nova_venda);
        btnNova.setOnClickListener(v -> irAdiante());

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                irAdiante();
            }
        });

        if (comprovante != null && !comprovante.isEmpty()) {
            imprimir();
        }
    }

    private void imprimir() {
        if (comprovante == null || comprovante.isEmpty()) {
            Toast.makeText(this, R.string.sem_comprovante, Toast.LENGTH_SHORT).show();
            return;
        }
        try {
            ImpressoraPos impressora = ((PosApplication) getApplication()).getImpressoraPos();
            if (cupomFiscal) {
                impressora.imprimirDanfce(comprovante, qrConteudo);
                Toast.makeText(this, R.string.danfce_enviado, Toast.LENGTH_SHORT).show();
            } else {
                impressora.imprimirTexto(comprovante);
                Toast.makeText(this, R.string.comprovante_enviado, Toast.LENGTH_SHORT).show();
            }
        } catch (Exception e) {
            Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void irAdiante() {
        Intent intent = voltarMesas
                ? new Intent(this, MesasActivity.class)
                : new Intent(this, VendaActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
        finish();
    }
}

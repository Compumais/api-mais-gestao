package com.pos_mais_gestao.ui.config;

import android.os.Bundle;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.domain.balanca.BalancaConfig;
import com.pos_mais_gestao.domain.balanca.BalancaDiagnostico;
import com.pos_mais_gestao.hardware.balanca.BalancaManager;
import java.text.DateFormat;
import java.util.Date;
import java.util.Locale;

public class BalancaDiagnosticoActivity extends AppCompatActivity {
    private BalancaManager manager;
    private PrefsStore prefs;
    private TextView txtStatus;
    private TextView txtDetalhes;
    private TextView txtHex;
    private final BalancaManager.Listener listener = this::atualizar;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_balanca_diagnostico);
        PosApplication app = (PosApplication) getApplication();
        manager = app.getBalancaManager();
        prefs = app.getPrefsStore();
        txtStatus = findViewById(R.id.txtDiagStatus);
        txtDetalhes = findViewById(R.id.txtDiagDetalhes);
        txtHex = findViewById(R.id.txtDiagHex);
        MaterialButton btnLer = findViewById(R.id.btnDiagLerPeso);
        MaterialButton btnVoltar = findViewById(R.id.btnDiagVoltar);
        btnLer.setOnClickListener(v -> manager.solicitarPeso(leitura -> atualizar(manager.getDiagnostico())));
        btnVoltar.setOnClickListener(v -> finish());
    }

    @Override
    protected void onStart() {
        super.onStart();
        manager.adicionarListener(listener);
    }

    @Override
    protected void onStop() {
        manager.removerListener(listener);
        super.onStop();
    }

    private void atualizar(BalancaDiagnostico diagnostico) {
        BalancaConfig config = prefs.getBalancaConfig();
        txtStatus.setText(getString(
                R.string.balanca_estado_detalhe,
                diagnostico.estado,
                diagnostico.mensagem));
        String horario = diagnostico.ultimaComunicacao == 0
                ? getString(R.string.balanca_nunca)
                : DateFormat.getTimeInstance(DateFormat.MEDIUM, new Locale("pt", "BR"))
                        .format(new Date(diagnostico.ultimaComunicacao));
        String usb = diagnostico.vendorId < 0
                ? getString(R.string.balanca_nao_identificado)
                : String.format(
                        Locale.ROOT,
                        "VID %04X / PID %04X",
                        diagnostico.vendorId,
                        diagnostico.productId);
        txtDetalhes.setText(getString(
                R.string.balanca_diag_detalhes,
                vazio(diagnostico.dispositivo),
                usb,
                vazio(diagnostico.driver),
                config.baudRate,
                vazio(diagnostico.ultimoPeso),
                horario,
                vazio(diagnostico.ultimoErro)));
        txtHex.setText(config.logHex
                ? getString(
                        R.string.balanca_diag_hex,
                        vazio(diagnostico.ultimoTxHex),
                        vazio(diagnostico.ultimoRxHex))
                : getString(R.string.balanca_log_desativado));
    }

    private String vazio(String valor) {
        return valor == null || valor.isEmpty() ? "—" : valor;
    }
}

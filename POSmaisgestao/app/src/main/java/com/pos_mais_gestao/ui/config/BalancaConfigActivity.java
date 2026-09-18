package com.pos_mais_gestao.ui.config;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.LinearLayout;
import android.widget.RadioButton;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.switchmaterial.SwitchMaterial;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.domain.balanca.BalancaConfig;
import com.pos_mais_gestao.domain.balanca.DispositivoBalanca;
import com.pos_mais_gestao.hardware.balanca.BalancaManager;
import java.util.List;

public class BalancaConfigActivity extends AppCompatActivity {
    private static final Integer[] BAUDS = {2400, 4800, 9600};

    private BalancaManager manager;
    private PrefsStore prefs;
    private SwitchMaterial switchHabilitada;
    private SwitchMaterial switchLogHex;
    private Spinner spinnerBaud;
    private LinearLayout listaDispositivos;
    private TextView txtSemDispositivos;
    private TextView txtStatus;
    private boolean carregando;

    private final BalancaManager.Listener listener =
            diagnostico -> txtStatus.setText(diagnostico.mensagem);

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_balanca_config);

        PosApplication app = (PosApplication) getApplication();
        manager = app.getBalancaManager();
        prefs = app.getPrefsStore();
        switchHabilitada = findViewById(R.id.switchBalancaHabilitada);
        switchLogHex = findViewById(R.id.switchBalancaLogHex);
        spinnerBaud = findViewById(R.id.spinnerBalancaBaud);
        listaDispositivos = findViewById(R.id.listaDispositivosBalanca);
        txtSemDispositivos = findViewById(R.id.txtSemDispositivosBalanca);
        txtStatus = findViewById(R.id.txtBalancaConfigStatus);
        MaterialButton btnAtualizar = findViewById(R.id.btnAtualizarBalanca);
        MaterialButton btnTestar = findViewById(R.id.btnTestarBalanca);
        MaterialButton btnDiagnostico = findViewById(R.id.btnDiagnosticoBalanca);
        MaterialButton btnVoltar = findViewById(R.id.btnVoltarBalanca);

        ArrayAdapter<Integer> baudAdapter =
                new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, BAUDS);
        baudAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerBaud.setAdapter(baudAdapter);

        carregarPreferencias();
        switchHabilitada.setOnCheckedChangeListener((button, checked) -> {
            if (!carregando) {
                manager.setHabilitada(checked);
            }
        });
        switchLogHex.setOnCheckedChangeListener((button, checked) -> {
            if (!carregando) {
                manager.setLogHex(checked);
            }
        });
        spinnerBaud.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                if (!carregando) {
                    prefs.setBalancaSerialConfig(BAUDS[position], 8, 1, 0);
                    manager.aplicarConfiguracao();
                }
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {}
        });
        btnAtualizar.setOnClickListener(v -> carregarDispositivos());
        btnTestar.setOnClickListener(v -> testarLeitura());
        btnDiagnostico.setOnClickListener(v ->
                startActivity(new Intent(this, BalancaDiagnosticoActivity.class)));
        btnVoltar.setOnClickListener(v -> finish());
        carregarDispositivos();
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

    private void carregarPreferencias() {
        carregando = true;
        BalancaConfig config = prefs.getBalancaConfig();
        switchHabilitada.setChecked(config.habilitada);
        switchLogHex.setChecked(config.logHex);
        for (int i = 0; i < BAUDS.length; i++) {
            if (BAUDS[i] == config.baudRate) {
                spinnerBaud.setSelection(i);
                break;
            }
        }
        carregando = false;
    }

    private void carregarDispositivos() {
        List<DispositivoBalanca> dispositivos = manager.listarDispositivos();
        BalancaConfig selecionada = prefs.getBalancaConfig();
        listaDispositivos.removeAllViews();
        for (DispositivoBalanca info : dispositivos) {
            RadioButton radio = new RadioButton(this);
            radio.setText(getString(R.string.balanca_dispositivo_item, info.nome, info.detalhe()));
            radio.setMinHeight(dp(56));
            radio.setChecked(info.vendorId == selecionada.vendorId
                    && info.productId == selecionada.productId
                    && (selecionada.serial.isEmpty() || selecionada.serial.equals(info.serial)));
            radio.setOnClickListener(v -> {
                manager.selecionarDispositivo(info);
                carregarDispositivos();
            });
            listaDispositivos.addView(radio);
        }
        txtSemDispositivos.setVisibility(dispositivos.isEmpty() ? View.VISIBLE : View.GONE);
    }

    private void testarLeitura() {
        if (!manager.isHabilitada()) {
            Toast.makeText(this, R.string.balanca_habilite_para_testar, Toast.LENGTH_LONG).show();
            return;
        }
        manager.solicitarPeso(leitura -> Toast.makeText(
                this,
                leitura.isPesoValido()
                        ? getString(R.string.balanca_peso_kg, leitura.getPesoKg().toPlainString())
                        : leitura.getMensagem(),
                Toast.LENGTH_LONG).show());
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}

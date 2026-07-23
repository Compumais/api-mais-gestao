package com.pos_mais_gestao.ui.falha;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.domain.ItemFicha;
import com.pos_mais_gestao.hardware.ImpressoraPos;
import com.pos_mais_gestao.ui.home.HomeActivity;
import com.pos_mais_gestao.ui.mesas.MesasActivity;
import com.pos_mais_gestao.ui.venda.VendaActivity;
import java.util.ArrayList;

public class FalhaNfceActivity extends AppCompatActivity {
    public static final String EXTRA_MOTIVO = "motivo";
    public static final String EXTRA_CSTAT = "cstat";
    public static final String EXTRA_CODIGO = "codigo";
    public static final String EXTRA_COMPROVANTE = "comprovante";
    public static final String EXTRA_VOLTAR_MESAS = "voltar_mesas";
    public static final String EXTRA_FICHAS = "fichas_evento";
    public static final String EXTRA_EMPRESA_NOME = "empresa_nome";

    private String comprovante;
    private String codigo;
    private String empresaNome;
    private boolean voltarMesas;
    private ArrayList<ItemFicha> fichas;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_falha_nfce);

        String motivo = getIntent().getStringExtra(EXTRA_MOTIVO);
        String cStat = getIntent().getStringExtra(EXTRA_CSTAT);
        codigo = getIntent().getStringExtra(EXTRA_CODIGO);
        comprovante = getIntent().getStringExtra(EXTRA_COMPROVANTE);
        voltarMesas = getIntent().getBooleanExtra(EXTRA_VOLTAR_MESAS, false);
        empresaNome = getIntent().getStringExtra(EXTRA_EMPRESA_NOME);
        Object raw = getIntent().getSerializableExtra(EXTRA_FICHAS);
        if (raw instanceof ArrayList) {
            //noinspection unchecked
            fichas = (ArrayList<ItemFicha>) raw;
        }

        TextView txtCstat = findViewById(R.id.txtCstat);
        if (cStat != null && !cStat.isEmpty()) {
            txtCstat.setText(getString(R.string.nfce_cstat, cStat));
            txtCstat.setVisibility(View.VISIBLE);
        } else {
            txtCstat.setVisibility(View.GONE);
        }

        TextView txtMotivo = findViewById(R.id.txtMotivo);
        txtMotivo.setText(motivo != null && !motivo.isEmpty()
                ? motivo
                : getString(R.string.nfce_rejeitada_motivo_padrao));

        TextView txtCodigo = findViewById(R.id.txtCodigoVenda);
        if (codigo != null && !codigo.isEmpty()) {
            txtCodigo.setText(getString(R.string.codigo_pedido, codigo));
        } else {
            txtCodigo.setText("");
        }

        MaterialButton btnImprimir = findViewById(R.id.btnImprimirComprovanteFalha);
        btnImprimir.setOnClickListener(v -> imprimirComprovante());
        if (comprovante == null || comprovante.isEmpty()) {
            btnImprimir.setEnabled(false);
        }

        MaterialButton btnFichas = findViewById(R.id.btnImprimirFichasFalha);
        boolean temFichas = fichas != null && !fichas.isEmpty();
        btnFichas.setVisibility(temFichas ? View.VISIBLE : View.GONE);
        btnFichas.setOnClickListener(v -> imprimirFichas());

        MaterialButton btnNova = findViewById(R.id.btnNovaVendaFalha);
        btnNova.setText(voltarMesas ? R.string.voltar_mesas : R.string.nova_venda);
        btnNova.setOnClickListener(v -> irAdiante());

        MaterialButton btnInicio = findViewById(R.id.btnInicioFalha);
        btnInicio.setOnClickListener(v -> irParaInicio());

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                irAdiante();
            }
        });

        if (comprovante != null && !comprovante.isEmpty()) {
            imprimirComprovante();
        }
        if (temFichas) {
            imprimirFichas();
        }
    }

    private void imprimirComprovante() {
        if (comprovante == null || comprovante.isEmpty()) {
            Toast.makeText(this, R.string.sem_comprovante, Toast.LENGTH_SHORT).show();
            return;
        }
        try {
            ImpressoraPos impressora = ((PosApplication) getApplication()).getImpressoraPos();
            impressora.imprimirTexto(comprovante);
            Toast.makeText(this, R.string.comprovante_enviado, Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void imprimirFichas() {
        if (fichas == null || fichas.isEmpty()) {
            Toast.makeText(this, R.string.sem_fichas, Toast.LENGTH_SHORT).show();
            return;
        }
        try {
            ImpressoraPos impressora = ((PosApplication) getApplication()).getImpressoraPos();
            impressora.imprimirFichasEvento(empresaNome, codigo, fichas);
            Toast.makeText(this, R.string.fichas_enviadas, Toast.LENGTH_SHORT).show();
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

    private void irParaInicio() {
        Intent intent = new Intent(this, HomeActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
        finish();
    }
}

package com.pos_mais_gestao.ui.mesas;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.pos_mais_gestao.PosApplication;
import com.pos_mais_gestao.R;
import com.pos_mais_gestao.data.api.ApiClient;
import com.pos_mais_gestao.data.api.ApiException;
import com.pos_mais_gestao.data.api.ContaMesaDto;
import com.pos_mais_gestao.data.local.PrefsStore;
import com.pos_mais_gestao.ui.OfflineBanner;
import com.pos_mais_gestao.ui.pedido.PedidoActivity;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class OccupyActivity extends AppCompatActivity {
    public static final String EXTRA_NUMERO = "numero";
    public static final String EXTRA_ID_CONTA = "id_conta";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private PrefsStore prefs;
    private ApiClient api;
    private int numero;
    private TextInputEditText inputName;
    private MaterialButton btnOccupy;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_occupy);

        PosApplication app = (PosApplication) getApplication();
        prefs = app.getPrefsStore();
        api = app.getApiClient();
        numero = getIntent().getIntExtra(EXTRA_NUMERO, 0);

        MaterialToolbar toolbar = findViewById(R.id.toolbarOccupy);
        setSupportActionBar(toolbar);
        toolbar.setNavigationOnClickListener(v -> finish());
        TextView txtMesa = findViewById(R.id.txtMesa);
        String rotulo = getString(prefs.isModeloComanda() ? R.string.comanda_n : R.string.mesa_n, numero);
        String titulo = getString(R.string.ocupar_mesa, rotulo);
        toolbar.setTitle(titulo);
        txtMesa.setText(titulo);
        inputName = findViewById(R.id.inputName);
        inputName.setText("Cliente");
        btnOccupy = findViewById(R.id.btnOccupy);
        btnOccupy.setOnClickListener(v -> ocupar());
        OfflineBanner.bind(this, true, null);
    }

    private void ocupar() {
        String nome = inputName.getText() == null ? "" : inputName.getText().toString().trim();
        if (nome.isEmpty()) {
            nome = "Cliente";
        }
        btnOccupy.setEnabled(false);
        String finalNome = nome;
        executor.execute(() -> {
            try {
                ContaMesaDto conta = api.abrirMesa(numero, finalNome);
                runOnUiThread(() -> {
                    Intent intent = new Intent(this, PedidoActivity.class);
                    intent.putExtra(PedidoActivity.EXTRA_ID_CONTA, conta.id);
                    intent.putExtra(PedidoActivity.EXTRA_NUMERO, numero);
                    intent.putExtra(PedidoActivity.EXTRA_NOME, finalNome);
                    startActivity(intent);
                    finish();
                });
            } catch (ApiException e) {
                runOnUiThread(() -> {
                    btnOccupy.setEnabled(true);
                    OfflineBanner.bind(this, false, e.getMessage());
                    Toast.makeText(this, e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executor.shutdownNow();
    }
}

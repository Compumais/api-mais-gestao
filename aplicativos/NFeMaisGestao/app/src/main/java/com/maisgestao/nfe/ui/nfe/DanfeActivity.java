package com.maisgestao.nfe.ui.nfe;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.Toast;
import com.maisgestao.nfe.ui.NfeAppCompatActivity;
import androidx.core.content.FileProvider;
import com.maisgestao.nfe.NfeApplication;
import com.maisgestao.nfe.R;
import com.maisgestao.nfe.data.api.ApiClient;
import com.maisgestao.nfe.util.UiExecutor;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class DanfeActivity extends NfeAppCompatActivity {
    public static final String EXTRA_NOTA_ID = "nota_id";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private ProgressBar progress;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_danfe);
        progress = findViewById(R.id.progress);

        String notaId = getIntent().getStringExtra(EXTRA_NOTA_ID);
        if (notaId == null) {
            finish();
            return;
        }

        ApiClient api = ((NfeApplication) getApplication()).getApiClient();
        UiExecutor.run(
                this,
                executor,
                () -> {
                    byte[] pdf = api.downloadDanfe(notaId);
                    File dir = new File(getCacheDir(), "danfe");
                    //noinspection ResultOfMethodCallIgnored
                    dir.mkdirs();
                    File file = new File(dir, "danfe-" + notaId + ".pdf");
                    try (FileOutputStream out = new FileOutputStream(file)) {
                        out.write(pdf);
                    }
                    Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", file);
                    runOnUiThread(() -> abrirPdf(uri));
                },
                () -> progress.setVisibility(View.GONE),
                error -> {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(this, error.getMessage(), Toast.LENGTH_LONG).show();
                    finish();
                });
    }

    private void abrirPdf(Uri uri) {
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/pdf");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try {
            startActivity(intent);
        } catch (Exception error) {
            Toast.makeText(this, R.string.sem_visualizador_pdf, Toast.LENGTH_LONG).show();
        }
        finish();
    }

    @Override
    protected void onDestroy() {
        executor.shutdownNow();
        super.onDestroy();
    }
}

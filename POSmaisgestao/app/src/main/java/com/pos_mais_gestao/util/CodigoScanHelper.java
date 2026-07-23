package com.pos_mais_gestao.util;

import android.Manifest;
import android.content.pm.PackageManager;
import android.widget.Toast;
import androidx.activity.ComponentActivity;
import androidx.activity.result.ActivityResultLauncher;
import androidx.core.content.ContextCompat;
import com.journeyapps.barcodescanner.ScanContract;
import com.journeyapps.barcodescanner.ScanOptions;
import com.pos_mais_gestao.R;

/**
 * Encapsula permissão de câmera + ZXing ScanContract.
 */
public final class CodigoScanHelper {
    public interface Listener {
        void onCodigoLido(String codigo);
    }

    private final ComponentActivity activity;
    private final Listener listener;
    private final ActivityResultLauncher<ScanOptions> scanLauncher;
    private final ActivityResultLauncher<String> permissionLauncher;

    public CodigoScanHelper(
            ComponentActivity activity,
            ActivityResultLauncher<ScanOptions> scanLauncher,
            ActivityResultLauncher<String> permissionLauncher,
            Listener listener) {
        this.activity = activity;
        this.scanLauncher = scanLauncher;
        this.permissionLauncher = permissionLauncher;
        this.listener = listener;
    }

    public static ActivityResultLauncher<ScanOptions> registrarScan(
            ComponentActivity activity, Listener listener) {
        return activity.registerForActivityResult(new ScanContract(), result -> {
            if (result.getContents() != null && !result.getContents().trim().isEmpty()) {
                listener.onCodigoLido(result.getContents().trim());
            }
        });
    }

    public static ActivityResultLauncher<String> registrarPermissao(
            ComponentActivity activity, Runnable onGranted) {
        return activity.registerForActivityResult(
                new androidx.activity.result.contract.ActivityResultContracts.RequestPermission(),
                granted -> {
                    if (granted) {
                        onGranted.run();
                    } else {
                        Toast.makeText(activity, R.string.permissao_camera_negada, Toast.LENGTH_LONG)
                                .show();
                    }
                });
    }

    public void iniciar() {
        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED) {
            abrirCamera();
        } else {
            permissionLauncher.launch(Manifest.permission.CAMERA);
        }
    }

    public void abrirCamera() {
        ScanOptions options = new ScanOptions();
        options.setDesiredBarcodeFormats(ScanOptions.ALL_CODE_TYPES);
        options.setPrompt(activity.getString(R.string.escanear_codigo));
        options.setBeepEnabled(true);
        options.setOrientationLocked(true);
        options.setCaptureActivity(CodigoCaptureActivity.class);
        scanLauncher.launch(options);
    }
}

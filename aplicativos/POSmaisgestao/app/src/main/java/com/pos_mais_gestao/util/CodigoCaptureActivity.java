package com.pos_mais_gestao.util;

import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import com.google.android.material.button.MaterialButton;
import com.journeyapps.barcodescanner.CaptureManager;
import com.journeyapps.barcodescanner.DecoratedBarcodeView;
import com.pos_mais_gestao.R;

/**
 * Scanner com lanterna ligada automaticamente e botão para ligar/desligar.
 */
public class CodigoCaptureActivity extends AppCompatActivity
        implements DecoratedBarcodeView.TorchListener {
    private CaptureManager capture;
    private DecoratedBarcodeView barcodeView;
    private MaterialButton btnFlash;
    private boolean torchOn;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_codigo_capture);

        barcodeView = findViewById(R.id.zxing_barcode_scanner);
        barcodeView.setTorchListener(this);
        btnFlash = findViewById(R.id.btnFlash);

        if (!temFlash()) {
            btnFlash.setVisibility(View.GONE);
        } else {
            btnFlash.setOnClickListener(v -> alternarFlash());
        }

        capture = new CaptureManager(this, barcodeView);
        capture.initializeFromIntent(getIntent(), savedInstanceState);
        capture.decode();
    }

    @Override
    protected void onResume() {
        super.onResume();
        capture.onResume();
        if (temFlash()) {
            // Liga o flash automaticamente ao abrir o scanner
            barcodeView.post(() -> barcodeView.setTorchOn());
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        capture.onPause();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        capture.onDestroy();
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        capture.onSaveInstanceState(outState);
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        capture.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        return barcodeView.onKeyDown(keyCode, event) || super.onKeyDown(keyCode, event);
    }

    private void alternarFlash() {
        if (torchOn) {
            barcodeView.setTorchOff();
        } else {
            barcodeView.setTorchOn();
        }
    }

    private boolean temFlash() {
        return getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA_FLASH);
    }

    @Override
    public void onTorchOn() {
        torchOn = true;
        btnFlash.setText(R.string.flash_desligar);
    }

    @Override
    public void onTorchOff() {
        torchOn = false;
        btnFlash.setText(R.string.flash_ligar);
    }
}

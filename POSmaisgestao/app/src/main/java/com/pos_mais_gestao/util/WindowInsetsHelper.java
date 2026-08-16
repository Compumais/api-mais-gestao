package com.pos_mais_gestao.util;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.view.View;
import android.view.Window;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.pos_mais_gestao.R;

/** Evita que a barra de status/navegação sobreponha o conteúdo (Android 15+ edge-to-edge). */
public final class WindowInsetsHelper {
    private WindowInsetsHelper() {}

    public static void prepararJanela(Activity activity) {
        if (!deveAplicar(activity)) {
            return;
        }
        Window window = activity.getWindow();
        if (window == null) {
            return;
        }
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false);
            controller.setAppearanceLightNavigationBars(false);
        }
    }

    public static void aplicarConteudo(Activity activity) {
        if (!deveAplicar(activity)) {
            return;
        }
        View content = activity.findViewById(android.R.id.content);
        if (content == null || Boolean.TRUE.equals(content.getTag(R.id.pos_insets_applied))) {
            return;
        }
        content.setTag(R.id.pos_insets_applied, Boolean.TRUE);
        content.setBackgroundColor(ContextCompat.getColor(activity, R.color.primary));
        ViewCompat.setOnApplyWindowInsetsListener(content, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(content);
    }

    public static void aplicar(Activity activity) {
        prepararJanela(activity);
        aplicarConteudo(activity);
    }

    private static boolean deveAplicar(Activity activity) {
        return activity != null
                && !(activity instanceof CodigoCaptureActivity)
                && Build.VERSION.SDK_INT >= 35;
    }
}

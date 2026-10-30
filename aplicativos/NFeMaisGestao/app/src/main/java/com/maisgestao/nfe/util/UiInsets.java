package com.maisgestao.nfe.util;

import android.graphics.Color;
import android.view.View;
import androidx.annotation.IdRes;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.maisgestao.nfe.R;

/**
 * Edge-to-edge with a navy header under the status bar; pads header content and bottom bars
 * so interactive UI never sits under system bars.
 */
public final class UiInsets {

    private UiInsets() {
    }

    public static void setup(
            AppCompatActivity activity,
            @IdRes int rootId,
            @IdRes int headerBleedId,
            @IdRes int headerContentId,
            @IdRes int bottomBarId) {
        View root = activity.findViewById(rootId);
        if (root == null) {
            return;
        }
        View headerBleed = headerBleedId != 0 ? activity.findViewById(headerBleedId) : null;
        View headerContent = headerContentId != 0 ? activity.findViewById(headerContentId) : null;
        View bottomBar = bottomBarId != 0 ? activity.findViewById(bottomBarId) : null;
        setup(activity, root, headerBleed, headerContent, bottomBar);
    }

    public static void setup(
            AppCompatActivity activity,
            View root,
            View headerBleed,
            View headerContent,
            View bottomBar) {
        WindowCompat.setDecorFitsSystemWindows(activity.getWindow(), false);
        activity.getWindow().setStatusBarColor(Color.TRANSPARENT);
        activity.getWindow().setNavigationBarColor(activity.getColor(R.color.page_background));

        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(activity.getWindow(), activity.getWindow().getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(false);
            controller.setAppearanceLightNavigationBars(true);
        }

        final int headerBaseTop = headerContent != null ? headerContent.getPaddingTop() : 0;
        final int bottomBaseBottom = bottomBar != null ? bottomBar.getPaddingBottom() : 0;
        final int rootBaseBottom = root.getPaddingBottom();
        final int rootBaseTop = root.getPaddingTop();

        ViewCompat.setOnApplyWindowInsetsListener(root, (v, windowInsets) -> {
            Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());

            if (headerContent != null) {
                headerContent.setPadding(
                        headerContent.getPaddingLeft(),
                        headerBaseTop + bars.top,
                        headerContent.getPaddingRight(),
                        headerContent.getPaddingBottom());
            } else if (headerBleed == null) {
                v.setPadding(v.getPaddingLeft(), rootBaseTop + bars.top, v.getPaddingRight(), v.getPaddingBottom());
            }

            if (bottomBar != null) {
                bottomBar.setPadding(
                        bottomBar.getPaddingLeft(),
                        bottomBar.getPaddingTop(),
                        bottomBar.getPaddingRight(),
                        bottomBaseBottom + bars.bottom);
            } else {
                v.setPadding(v.getPaddingLeft(), v.getPaddingTop(), v.getPaddingRight(), rootBaseBottom + bars.bottom);
            }

            return windowInsets;
        });
        ViewCompat.requestApplyInsets(root);
    }
}

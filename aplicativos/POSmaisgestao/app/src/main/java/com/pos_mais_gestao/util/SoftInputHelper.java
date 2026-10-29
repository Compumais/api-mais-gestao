package com.pos_mais_gestao.util;

import android.app.Activity;
import android.view.View;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;

/** Impede o teclado de abrir sozinho ao entrar na Activity. */
public final class SoftInputHelper {
    private SoftInputHelper() {}

    public static void hideOnStart(Activity activity) {
        activity.getWindow().setSoftInputMode(
                WindowManager.LayoutParams.SOFT_INPUT_STATE_HIDDEN
                        | WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        View root = activity.findViewById(android.R.id.content);
        if (root != null) {
            root.setFocusable(true);
            root.setFocusableInTouchMode(true);
            root.requestFocus();
        }
        View current = activity.getCurrentFocus();
        if (current != null) {
            current.clearFocus();
        }
    }

    public static void hideKeyboard(Activity activity) {
        View focus = activity.getCurrentFocus();
        if (focus == null) {
            focus = activity.findViewById(android.R.id.content);
        }
        if (focus == null) {
            return;
        }
        InputMethodManager imm =
                (InputMethodManager) activity.getSystemService(Activity.INPUT_METHOD_SERVICE);
        if (imm != null) {
            imm.hideSoftInputFromWindow(focus.getWindowToken(), 0);
        }
        focus.clearFocus();
    }
}

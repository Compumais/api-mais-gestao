package com.pos_mais_gestao.util;

import androidx.appcompat.app.AppCompatDelegate;

public final class ThemeHelper {
    public static final String LIGHT = "light";
    public static final String DARK = "dark";
    public static final String SYSTEM = "system";

    private ThemeHelper() {}

    public static void aplicar(String mode) {
        int nightMode;
        if (LIGHT.equals(mode)) {
            nightMode = AppCompatDelegate.MODE_NIGHT_NO;
        } else if (DARK.equals(mode)) {
            nightMode = AppCompatDelegate.MODE_NIGHT_YES;
        } else {
            nightMode = AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM;
        }
        AppCompatDelegate.setDefaultNightMode(nightMode);
    }

    public static String normalizar(String mode) {
        if (DARK.equals(mode) || SYSTEM.equals(mode) || LIGHT.equals(mode)) {
            return mode;
        }
        return LIGHT;
    }
}

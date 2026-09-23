import 'package:flutter/material.dart';

/// Tokens alinhados ao POS Android / PDV Mais Gestão.
abstract final class MgColors {
  static const primary = Color(0xFF4271F0);
  static const primaryDark = Color(0xFF0B42DA);
  static const primaryForeground = Color(0xFFFFFFFF);
  static const foreground = Color(0xFF111827);
  static const background = Color(0xFFFFFFFF);
  static const surface = Color(0xFFF3F4F6);
  static const mutedForeground = Color(0xFF374151);
  static const accent = Color(0xFFD0D9F1);
  static const border = Color(0xFF9CA3AF);
  static const card = Color(0xFFFFFFFF);
  static const danger = Color(0xFFE5010C);
  static const success = Color(0xFF16A34A);
  static const sidebar = Color(0xFF002148);
  static const sidebarAccent = Color(0xFF0F375D);
}

/// Tipografia alinhada ao PDV: Inter / Segoe UI / system-ui.
const _fontFamily = 'Segoe UI';
const _fontFallback = ['Inter', 'Roboto', 'Arial', 'sans-serif'];

ThemeData buildMgTheme() {
  final colorScheme = ColorScheme.light(
    primary: MgColors.primary,
    onPrimary: MgColors.primaryForeground,
    primaryContainer: MgColors.accent,
    onPrimaryContainer: MgColors.primaryDark,
    secondary: MgColors.accent,
    onSecondary: MgColors.foreground,
    surface: MgColors.background,
    onSurface: MgColors.foreground,
    error: MgColors.danger,
    onError: Colors.white,
    outline: MgColors.border,
  );

  final base = ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: MgColors.surface,
    fontFamily: _fontFamily,
    fontFamilyFallback: _fontFallback,
  );

  return base.copyWith(
    textTheme: base.textTheme.apply(
      bodyColor: MgColors.foreground,
      displayColor: MgColors.foreground,
      fontFamily: _fontFamily,
      fontFamilyFallback: _fontFallback,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: MgColors.background,
      foregroundColor: MgColors.foreground,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: false,
      titleTextStyle: const TextStyle(
        fontFamily: _fontFamily,
        fontFamilyFallback: _fontFallback,
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: MgColors.foreground,
        letterSpacing: -0.4,
      ),
    ),
    cardTheme: CardThemeData(
      color: MgColors.card,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: const BorderSide(color: MgColors.border, width: 1),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: MgColors.background,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: MgColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: MgColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: MgColors.primary, width: 2),
      ),
      labelStyle: const TextStyle(color: MgColors.mutedForeground),
      hintStyle: TextStyle(color: MgColors.mutedForeground.withValues(alpha: 0.7)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: MgColors.primary,
        foregroundColor: MgColors.primaryForeground,
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        textStyle: const TextStyle(
          fontFamily: _fontFamily,
          fontFamilyFallback: _fontFallback,
          fontWeight: FontWeight.w600,
          fontSize: 16,
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: MgColors.foreground,
        minimumSize: const Size.fromHeight(48),
        side: const BorderSide(color: MgColors.border),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        textStyle: const TextStyle(
          fontFamily: _fontFamily,
          fontFamilyFallback: _fontFallback,
          fontWeight: FontWeight.w600,
          fontSize: 15,
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: MgColors.primary,
        textStyle: const TextStyle(
          fontFamily: _fontFamily,
          fontFamilyFallback: _fontFallback,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((s) {
        if (s.contains(WidgetState.selected)) return MgColors.primary;
        return MgColors.border;
      }),
      trackColor: WidgetStateProperty.resolveWith((s) {
        if (s.contains(WidgetState.selected)) {
          return MgColors.primary.withValues(alpha: 0.35);
        }
        return MgColors.surface;
      }),
    ),
    dividerTheme: const DividerThemeData(color: MgColors.border, thickness: 1),
  );
}

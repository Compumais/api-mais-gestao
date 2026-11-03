import 'package:flutter/material.dart';

ThemeData temaPos() {
  const verde = Color(0xFF0F6B4C);
  return ThemeData(
    colorScheme: ColorScheme.fromSeed(
      seedColor: verde,
      primary: verde,
      surface: const Color(0xFFF4F7F5),
    ),
    useMaterial3: true,
    appBarTheme: const AppBarTheme(
      backgroundColor: verde,
      foregroundColor: Colors.white,
      centerTitle: false,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(56),
        textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
      ),
    ),
  );
}

String rotuloConta(bool comanda, int numero) {
  return '${comanda ? 'Comanda' : 'Mesa'} $numero';
}

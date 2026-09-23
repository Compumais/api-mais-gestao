import 'package:flutter/material.dart';
import 'package:estacao_balanca/core/lan_client.dart';
import 'package:estacao_balanca/core/prefs.dart';
import 'package:estacao_balanca/features/atalhos/atalhos_page.dart';
import 'package:estacao_balanca/features/auth/login_page.dart';
import 'package:estacao_balanca/features/comanda/estacao_page.dart';
import 'package:estacao_balanca/features/config/config_page.dart';
import 'package:estacao_balanca/theme/mg_theme.dart';

class EstacaoApp extends StatelessWidget {
  const EstacaoApp({super.key, required this.prefs});

  final AppPrefs prefs;

  @override
  Widget build(BuildContext context) {
    final client = LanClient(prefs);
    final home = prefs.hasSession
        ? EstacaoPage(prefs: prefs, client: client)
        : LoginPage(prefs: prefs, client: client);

    return MaterialApp(
      title: 'Estação Balança',
      debugShowCheckedModeBanner: false,
      theme: buildMgTheme(),
      home: home,
      routes: {
        '/login': (_) => LoginPage(prefs: prefs, client: client),
        '/estacao': (_) => EstacaoPage(prefs: prefs, client: client),
        '/atalhos': (_) => AtalhosPage(prefs: prefs, client: client),
        '/config': (_) => ConfigPage(prefs: prefs, client: client),
      },
    );
  }
}

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'sessao/sessao_store.dart';
import 'tef/tef_bridge.dart';
import 'ui/pos_shell.dart';
import 'ui/tema.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  runApp(PosSelfpayApp(store: SessaoStore(prefs)));
}

class PosSelfpayApp extends StatelessWidget {
  const PosSelfpayApp({super.key, required this.store, this.tef});

  final SessaoStore store;
  final TefBridge? tef;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'POSselfpay',
      theme: temaPos(),
      home: PosShell(store: store, tef: tef ?? TefAndroid()),
    );
  }
}

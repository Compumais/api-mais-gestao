import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:estacao_balanca/app.dart';
import 'package:estacao_balanca/core/prefs.dart';
import 'package:estacao_balanca/theme/mg_theme.dart';
import 'package:estacao_balanca/widgets/mg_boot_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    debugPrint('FlutterError: ${details.exceptionAsString()}');
  };
  PlatformDispatcher.instance.onError = (error, stack) {
    debugPrint('Uncaught: $error\n$stack');
    return true;
  };

  runApp(const _BootApp());
}

class _BootApp extends StatefulWidget {
  const _BootApp();

  @override
  State<_BootApp> createState() => _BootAppState();
}

class _BootAppState extends State<_BootApp> {
  AppPrefs? _prefs;
  Object? _erro;

  @override
  void initState() {
    super.initState();
    _carregar();
  }

  Future<void> _carregar() async {
    try {
      final prefs = await AppPrefs.create().timeout(
        const Duration(seconds: 8),
        onTimeout: () => throw StateError(
          'Timeout ao carregar preferências.',
        ),
      );
      if (!mounted) return;
      setState(() => _prefs = prefs);
    } catch (e, st) {
      debugPrint('Falha no boot: $e\n$st');
      if (!mounted) return;
      setState(() => _erro = e);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_prefs != null) {
      return EstacaoApp(prefs: _prefs!);
    }
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: buildMgTheme(),
      home: MgBootScreen(
        erro: _erro,
        onRetry: () {
          setState(() => _erro = null);
          _carregar();
        },
      ),
    );
  }
}

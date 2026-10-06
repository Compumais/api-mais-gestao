import 'package:flutter/material.dart';
import 'package:estacao_balanca/core/lan_client.dart';
import 'package:estacao_balanca/core/prefs.dart';
import 'package:estacao_balanca/theme/mg_theme.dart';
import 'package:estacao_balanca/widgets/mg_logo.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key, required this.prefs, required this.client});

  final AppPrefs prefs;
  final LanClient client;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _urlCtrl = TextEditingController();
  bool _busy = false;
  String? _erro;

  @override
  void initState() {
    super.initState();
    _urlCtrl.text = widget.prefs.baseUrl;
  }

  @override
  void dispose() {
    _urlCtrl.dispose();
    super.dispose();
  }

  Future<void> _entrar() async {
    setState(() {
      _busy = true;
      _erro = null;
    });
    try {
      await widget.prefs.aplicarUrlOuQr(_urlCtrl.text);
      await widget.client.health();
      await widget.client.conectarEstacao();
      if (!mounted) return;
      Navigator.of(context).pushReplacementNamed('/estacao');
    } catch (e) {
      setState(() => _erro = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 900;

    final form = _LoginCard(
      urlCtrl: _urlCtrl,
      erro: _erro,
      busy: _busy,
      onSubmit: _entrar,
    );

    if (!wide) {
      return Scaffold(
        backgroundColor: MgColors.surface,
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: form,
            ),
          ),
        ),
      );
    }

    return Scaffold(
      body: Row(
        children: [
          Expanded(
            child: Container(
              color: MgColors.sidebar,
              padding: const EdgeInsets.all(40),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MgLogo(variant: MgLogoVariant.branco, height: 44),
                  Spacer(),
                  Text(
                    'Estação de pesagem',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.8,
                      height: 1.15,
                    ),
                  ),
                  SizedBox(height: 12),
                  Text(
                    'Conecte ao PDV local, bipe a comanda e lance o consumo pela balança Prix.',
                    style: TextStyle(
                      color: Color(0xFFB8C7D9),
                      fontSize: 16,
                      height: 1.45,
                    ),
                  ),
                  Spacer(),
                ],
              ),
            ),
          ),
          Expanded(
            child: ColoredBox(
              color: MgColors.surface,
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(32),
                  child: form,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LoginCard extends StatelessWidget {
  const _LoginCard({
    required this.urlCtrl,
    required this.erro,
    required this.busy,
    required this.onSubmit,
  });

  final TextEditingController urlCtrl;
  final String? erro;
  final bool busy;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 440),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: MgColors.card,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: MgColors.border),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              height: 4,
              decoration: const BoxDecoration(
                color: MgColors.primary,
                borderRadius: BorderRadius.vertical(top: Radius.circular(7)),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (MediaQuery.sizeOf(context).width < 900) ...[
                    const Center(child: MgLogo(height: 40)),
                    const SizedBox(height: 20),
                  ],
                  Text(
                    'Conectar ao PDV',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.5,
                        ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Informe o IP ou URL do PDV na rede local. O caixa precisa estar aberto e logado.',
                    style: TextStyle(color: MgColors.mutedForeground),
                  ),
                  const SizedBox(height: 22),
                  TextField(
                    controller: urlCtrl,
                    decoration: const InputDecoration(
                      labelText: 'URL do PDV ou QR mgpos://',
                      hintText: 'http://192.168.0.10:5050',
                    ),
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => onSubmit(),
                  ),
                  if (erro != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      erro!,
                      style: const TextStyle(color: MgColors.danger, fontSize: 13),
                    ),
                  ],
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: busy ? null : onSubmit,
                    child: busy
                        ? const SizedBox(
                            height: 22,
                            width: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Continuar'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

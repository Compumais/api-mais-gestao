import 'package:flutter/material.dart';
import 'package:estacao_balanca/core/lan_client.dart';
import 'package:estacao_balanca/core/models.dart';
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
  final _emailCtrl = TextEditingController();
  final _senhaCtrl = TextEditingController();
  bool _busy = false;
  String? _erro;
  List<EmpresaLan> _empresas = [];
  EmpresaLan? _empresa;

  @override
  void initState() {
    super.initState();
    _urlCtrl.text = widget.prefs.baseUrl;
  }

  @override
  void dispose() {
    _urlCtrl.dispose();
    _emailCtrl.dispose();
    _senhaCtrl.dispose();
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
      await widget.client.login(_emailCtrl.text, _senhaCtrl.text);
      final empresas = await widget.client.listarEmpresas();
      if (!mounted) return;
      if (empresas.isEmpty) {
        Navigator.of(context).pushReplacementNamed('/estacao');
        return;
      }
      if (empresas.length == 1) {
        await widget.client.selecionarEmpresa(empresas.first);
        if (!mounted) return;
        Navigator.of(context).pushReplacementNamed('/estacao');
        return;
      }
      setState(() {
        _empresas = empresas;
        _empresa = empresas.first;
      });
    } catch (e) {
      setState(() => _erro = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirmarEmpresa() async {
    if (_empresa == null) return;
    setState(() {
      _busy = true;
      _erro = null;
    });
    try {
      await widget.client.selecionarEmpresa(_empresa!);
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
    final selecionandoEmpresa = _empresas.isNotEmpty;
    final wide = MediaQuery.sizeOf(context).width >= 900;

    final form = _LoginCard(
      selecionandoEmpresa: selecionandoEmpresa,
      urlCtrl: _urlCtrl,
      emailCtrl: _emailCtrl,
      senhaCtrl: _senhaCtrl,
      empresas: _empresas,
      empresa: _empresa,
      onEmpresa: (v) => setState(() => _empresa = v),
      erro: _erro,
      busy: _busy,
      onSubmit: selecionandoEmpresa ? _confirmarEmpresa : _entrar,
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
    required this.selecionandoEmpresa,
    required this.urlCtrl,
    required this.emailCtrl,
    required this.senhaCtrl,
    required this.empresas,
    required this.empresa,
    required this.onEmpresa,
    required this.erro,
    required this.busy,
    required this.onSubmit,
  });

  final bool selecionandoEmpresa;
  final TextEditingController urlCtrl;
  final TextEditingController emailCtrl;
  final TextEditingController senhaCtrl;
  final List<EmpresaLan> empresas;
  final EmpresaLan? empresa;
  final ValueChanged<EmpresaLan?> onEmpresa;
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
                    selecionandoEmpresa ? 'Selecionar empresa' : 'Entrar',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.5,
                        ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    selecionandoEmpresa
                        ? 'Escolha a empresa para operar nesta estação'
                        : 'Use o mesmo login da retaguarda / PDV local',
                    style: const TextStyle(color: MgColors.mutedForeground),
                  ),
                  const SizedBox(height: 22),
                  if (!selecionandoEmpresa) ...[
                    TextField(
                      controller: urlCtrl,
                      decoration: const InputDecoration(
                        labelText: 'URL do PDV ou QR mgpos://',
                        hintText: 'http://192.168.0.10:5050',
                      ),
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: emailCtrl,
                      decoration: const InputDecoration(labelText: 'E-mail'),
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: senhaCtrl,
                      decoration: const InputDecoration(labelText: 'Senha'),
                      obscureText: true,
                      onSubmitted: (_) => onSubmit(),
                    ),
                  ] else ...[
                    DropdownButtonFormField<EmpresaLan>(
                      value: empresa,
                      items: empresas
                          .map(
                            (e) => DropdownMenuItem(
                              value: e,
                              child: Text(e.nome),
                            ),
                          )
                          .toList(),
                      onChanged: onEmpresa,
                      decoration: const InputDecoration(labelText: 'Empresa'),
                    ),
                  ],
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
                        : Text(selecionandoEmpresa ? 'Continuar' : 'Entrar'),
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

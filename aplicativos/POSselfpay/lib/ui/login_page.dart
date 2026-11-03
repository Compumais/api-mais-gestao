import 'package:flutter/material.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({
    super.key,
    required this.urlInicial,
    required this.usuarioInicial,
    required this.ocupado,
    required this.entrar,
  });

  final String urlInicial;
  final String usuarioInicial;
  final bool ocupado;
  final Future<String?> Function(String url, String usuario, String senha) entrar;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  late final TextEditingController _url;
  late final TextEditingController _usuario;
  final TextEditingController _senha = TextEditingController();
  String? _erro;

  @override
  void initState() {
    super.initState();
    _url = TextEditingController(text: widget.urlInicial);
    _usuario = TextEditingController(text: widget.usuarioInicial);
  }

  @override
  void dispose() {
    _url.dispose();
    _usuario.dispose();
    _senha.dispose();
    super.dispose();
  }

  Future<void> _enviar() async {
    final erro = await widget.entrar(_url.text, _usuario.text, _senha.text);
    if (!mounted) {
      return;
    }
    setState(() => _erro = erro);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'POSselfpay',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 8),
                  const Text('Entre com o operador do PDV para pagar a conta.'),
                  const SizedBox(height: 24),
                  TextField(
                    controller: _url,
                    decoration: const InputDecoration(
                      labelText: 'Endereço do PDV',
                      hintText: 'http://192.168.0.10:5050',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.url,
                    autocorrect: false,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _usuario,
                    decoration: const InputDecoration(
                      labelText: 'Usuário',
                      border: OutlineInputBorder(),
                    ),
                    autocorrect: false,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _senha,
                    decoration: const InputDecoration(
                      labelText: 'Senha',
                      border: OutlineInputBorder(),
                    ),
                    obscureText: true,
                    onSubmitted: (_) => _enviar(),
                  ),
                  if (_erro != null) ...[
                    const SizedBox(height: 12),
                    Text(_erro!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                  ],
                  const SizedBox(height: 20),
                  FilledButton(
                    onPressed: widget.ocupado ? null : _enviar,
                    child: Text(widget.ocupado ? 'Entrando...' : 'Entrar'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

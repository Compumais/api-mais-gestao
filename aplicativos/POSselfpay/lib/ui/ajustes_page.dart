import 'package:flutter/material.dart';

class AjustesPage extends StatefulWidget {
  const AjustesPage({
    super.key,
    required this.cnpjInicial,
    required this.ocupado,
    required this.aoConfigurar,
    required this.aoAtivar,
    required this.aoVoltar,
  });

  final String cnpjInicial;
  final bool ocupado;
  final Future<String?> Function() aoConfigurar;
  final Future<String?> Function(String cnpj) aoAtivar;
  final VoidCallback aoVoltar;

  @override
  State<AjustesPage> createState() => _AjustesPageState();
}

class _AjustesPageState extends State<AjustesPage> {
  late final TextEditingController _cnpj;
  String? _aviso;

  @override
  void initState() {
    super.initState();
    _cnpj = TextEditingController(text: widget.cnpjInicial);
  }

  @override
  void dispose() {
    _cnpj.dispose();
    super.dispose();
  }

  Future<void> _rodar(Future<String?> Function() acao) async {
    final aviso = await acao();
    if (!mounted) {
      return;
    }
    setState(() => _aviso = aviso);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: widget.ocupado ? null : widget.aoVoltar,
        ),
        title: const Text('Ajustes do TEF'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Configurar e ativar o Intent Digital Hub é feito uma vez neste aparelho.',
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: widget.ocupado ? null : () => _rodar(widget.aoConfigurar),
            child: const Text('Configurar'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _cnpj,
            decoration: const InputDecoration(
              labelText: 'CNPJ ou CPF',
              border: OutlineInputBorder(),
            ),
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: widget.ocupado ? null : () => _rodar(() => widget.aoAtivar(_cnpj.text)),
            child: const Text('Ativar'),
          ),
          if (_aviso != null) ...[
            const SizedBox(height: 16),
            Text(_aviso!),
          ],
        ],
      ),
    );
  }
}

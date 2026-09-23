import 'package:flutter/material.dart';
import 'package:estacao_balanca/core/lan_client.dart';
import 'package:estacao_balanca/core/prefs.dart';
import 'package:estacao_balanca/features/balanca/balanca_facade.dart';
import 'package:estacao_balanca/features/balanca/serial_balanca_service.dart';
import 'package:estacao_balanca/theme/mg_theme.dart';
import 'package:estacao_balanca/widgets/mg_logo.dart';

class ConfigPage extends StatefulWidget {
  const ConfigPage({super.key, required this.prefs, required this.client});

  final AppPrefs prefs;
  final LanClient client;

  @override
  State<ConfigPage> createState() => _ConfigPageState();
}

class _ConfigPageState extends State<ConfigPage> {
  late final TextEditingController _urlCtrl;
  late final TextEditingController _portaCtrl;
  late final TextEditingController _baudCtrl;
  late bool _balancaLocal;
  late FontePeso _fonte;
  List<String> _portas = [];
  String? _diag;
  String? _testeMsg;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    _urlCtrl = TextEditingController(text: widget.prefs.baseUrl);
    _portaCtrl = TextEditingController(text: widget.prefs.portaSerial);
    _baudCtrl = TextEditingController(text: '${widget.prefs.baudRate}');
    _balancaLocal = widget.prefs.balancaLocalHabilitada;
    _fonte = widget.prefs.fontePeso;
    _carregarPortas();
  }

  Future<void> _carregarPortas() async {
    final portas = listarPortasSerialSeguro();
    if (!mounted) return;
    setState(() => _portas = portas);
  }

  @override
  void dispose() {
    _urlCtrl.dispose();
    _portaCtrl.dispose();
    _baudCtrl.dispose();
    super.dispose();
  }

  Future<void> _salvarSemSair() async {
    await widget.prefs.aplicarUrlOuQr(_urlCtrl.text);
    await widget.prefs.setPortaSerial(_portaCtrl.text.trim());
    await widget.prefs.setBaudRate(int.tryParse(_baudCtrl.text) ?? 2400);
    await widget.prefs.setBalancaLocalHabilitada(_balancaLocal);
    await widget.prefs.setFontePeso(_fonte);
  }

  Future<void> _salvar() async {
    await _salvarSemSair();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Configurações salvas'),
        backgroundColor: MgColors.primary,
      ),
    );
    Navigator.of(context).pop();
  }

  Future<void> _testarBalanca() async {
    setState(() {
      _busy = true;
      _testeMsg = null;
      _diag = null;
    });
    await _salvarSemSair();
    final facade = BalancaFacade(prefs: widget.prefs, client: widget.client);
    try {
      final leitura = await facade.lerPeso();
      setState(() {
        _diag = facade.diagnostico;
        _testeMsg = leitura.isPesoValido
            ? 'Peso: ${leitura.pesoKg!.toStringAsFixed(3)} kg'
            : (leitura.mensagem ?? leitura.estado.name);
      });
    } catch (e) {
      setState(() {
        _testeMsg = e.toString();
        _diag = facade.diagnostico;
      });
    } finally {
      await facade.desconectar();
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MgColors.surface,
      appBar: AppBar(title: const Text('Configurações')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const MgLogo(height: 36),
          const SizedBox(height: 20),
          _section(
            title: 'Conexão PDV',
            child: TextField(
              controller: _urlCtrl,
              decoration: const InputDecoration(
                labelText: 'URL / IP do PDV (ou QR mgpos://)',
                hintText: 'http://192.168.0.10:5050',
              ),
            ),
          ),
          const SizedBox(height: 16),
          _section(
            title: 'Atalhos da estação',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  '${widget.prefs.atalhoIds.length} produto(s) KG cadastrados',
                  style: const TextStyle(color: MgColors.mutedForeground),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () => Navigator.of(context).pushNamed('/atalhos'),
                  icon: const Icon(Icons.grid_view_rounded),
                  label: const Text('Cadastrar / editar atalhos'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _section(
            title: 'Balança Prix (Prt3)',
            child: Column(
              children: [
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Balança local (serial/USB)'),
                  value: _balancaLocal,
                  onChanged: (v) => setState(() => _balancaLocal = v),
                ),
                DropdownButtonFormField<FontePeso>(
                  value: _fonte,
                  decoration: const InputDecoration(labelText: 'Fonte de peso'),
                  items: const [
                    DropdownMenuItem(
                      value: FontePeso.auto,
                      child: Text('Auto (local, senão PDV)'),
                    ),
                    DropdownMenuItem(
                      value: FontePeso.local,
                      child: Text('Somente local (COM/USB)'),
                    ),
                    DropdownMenuItem(
                      value: FontePeso.pdv,
                      child: Text('Somente PDV'),
                    ),
                  ],
                  onChanged: (v) {
                    if (v != null) setState(() => _fonte = v);
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _portaCtrl,
                  decoration: InputDecoration(
                    labelText: 'Porta serial (ex.: COM3)',
                    suffixIcon: PopupMenuButton<String>(
                      icon: const Icon(Icons.list),
                      onSelected: (p) => setState(() => _portaCtrl.text = p),
                      itemBuilder: (_) => _portas
                          .map((p) => PopupMenuItem(value: p, child: Text(p)))
                          .toList(),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _baudCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Baud (Prix Prt3 = 2400)',
                  ),
                  keyboardType: TextInputType.number,
                ),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: _busy ? null : _testarBalanca,
                  icon: const Icon(Icons.monitor_weight_outlined),
                  label: const Text('Testar leitura de peso'),
                ),
                if (_testeMsg != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    _testeMsg!,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: MgColors.primary,
                        ),
                  ),
                ],
                if (_diag != null) ...[
                  const SizedBox(height: 8),
                  SelectableText(
                    _diag!,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: MgColors.mutedForeground,
                        ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(onPressed: _salvar, child: const Text('Salvar')),
          const SizedBox(height: 12),
          const Text(
            'Prix: C14=Prt3, C15=2400, 8N1.',
            style: TextStyle(color: MgColors.mutedForeground, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _section({required String title, required Widget child}) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: MgColors.card,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: MgColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 14,
                color: MgColors.mutedForeground,
              ),
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

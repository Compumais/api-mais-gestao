import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:estacao_balanca/core/lan_client.dart';
import 'package:estacao_balanca/core/models.dart';
import 'package:estacao_balanca/core/prefs.dart';
import 'package:estacao_balanca/features/balanca/balanca_facade.dart';
import 'package:estacao_balanca/theme/mg_theme.dart';
import 'package:estacao_balanca/widgets/mg_logo.dart';
import 'package:estacao_balanca/widgets/produto_imagem.dart';

enum _Passo { comanda, produto, peso }

/// Operação touch: bipe comanda → toque no atalho → pesa → confirma.
class EstacaoPage extends StatefulWidget {
  const EstacaoPage({super.key, required this.prefs, required this.client});

  final AppPrefs prefs;
  final LanClient client;

  @override
  State<EstacaoPage> createState() => _EstacaoPageState();
}

class _EstacaoPageState extends State<EstacaoPage> {
  final _scanCtrl = TextEditingController();
  final _scanFocus = FocusNode();
  late final BalancaFacade _balanca;

  _Passo _passo = _Passo.comanda;
  ContaLan? _conta;
  ProdutoLan? _produto;
  List<ProdutoLan> _atalhos = [];
  double? _peso;
  String? _status;
  String? _erro;
  bool _busy = false;
  bool _lendoPeso = false;

  @override
  void initState() {
    super.initState();
    _balanca = BalancaFacade(prefs: widget.prefs, client: widget.client);
    _atalhos = widget.prefs.lerAtalhosCache();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focarScanner();
      if (!widget.prefs.temAtalhos) {
        _avisarSemAtalhos();
      }
    });
  }

  @override
  void dispose() {
    _scanCtrl.dispose();
    _scanFocus.dispose();
    _balanca.desconectar();
    super.dispose();
  }

  void _focarScanner() {
    if (_passo == _Passo.comanda) {
      _scanFocus.requestFocus();
    }
  }

  Future<void> _avisarSemAtalhos() async {
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cadastre os atalhos'),
        content: const Text(
          'Selecione os produtos em KG que aparecerão nesta estação.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Depois'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.of(context).pushNamed('/atalhos').then((_) {
                setState(() => _atalhos = widget.prefs.lerAtalhosCache());
              });
            },
            child: const Text('Abrir atalhos'),
          ),
        ],
      ),
    );
  }

  Future<void> _onScanComanda(String raw) async {
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    final numero = int.tryParse(digits);
    _scanCtrl.clear();
    if (numero == null || numero <= 0 || _busy) {
      _focarScanner();
      return;
    }
    setState(() {
      _busy = true;
      _erro = null;
      _status = 'Abrindo comanda $numero…';
    });
    try {
      final conta = await widget.client.resolverComanda(numero);
      if (!mounted) return;
      setState(() {
        _conta = conta;
        _passo = _Passo.produto;
        _status = null;
      });
    } catch (e) {
      setState(() => _erro = e.toString());
      _focarScanner();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _selecionarProduto(ProdutoLan produto) async {
    setState(() {
      _produto = produto;
      _passo = _Passo.peso;
      _peso = null;
      _erro = null;
      _status = 'Coloque o produto na balança';
      _lendoPeso = true;
    });
    await _lerPesoLoop();
  }

  Future<void> _lerPesoLoop() async {
    // Tenta algumas leituras até obter peso válido
    for (var i = 0; i < 8; i++) {
      if (!mounted || _passo != _Passo.peso) return;
      final leitura = await _balanca.lerPeso(
        timeout: const Duration(seconds: 2),
      );
      if (!mounted || _passo != _Passo.peso) return;
      if (leitura.isPesoValido) {
        setState(() {
          _peso = leitura.pesoKg;
          _lendoPeso = false;
          _status = null;
        });
        return;
      }
      setState(() {
        _status = leitura.mensagem ?? 'Aguardando peso estável…';
      });
      await Future<void>.delayed(const Duration(milliseconds: 350));
    }
    if (!mounted || _passo != _Passo.peso) return;
    setState(() {
      _lendoPeso = false;
      _erro = 'Não foi possível ler o peso. Toque em Reler.';
    });
  }

  double? get _total {
    if (_produto == null || _peso == null || _peso! <= 0) return null;
    return _produto!.preco * _peso!;
  }

  Future<void> _confirmar() async {
    final conta = _conta;
    final produto = _produto;
    final peso = _peso;
    if (conta == null || produto == null || peso == null || peso <= 0) return;
    setState(() {
      _busy = true;
      _erro = null;
    });
    try {
      await widget.client.adicionarItem(
        idConta: conta.id,
        produto: produto,
        quantidade: peso,
      );
      SystemSound.play(SystemSoundType.click);
      if (!mounted) return;
      setState(() {
        _conta = null;
        _produto = null;
        _peso = null;
        _passo = _Passo.comanda;
        _status = 'Lançado! Passe a próxima comanda.';
        _erro = null;
      });
      _focarScanner();
    } catch (e) {
      setState(() => _erro = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _voltar() {
    setState(() {
      _erro = null;
      if (_passo == _Passo.peso) {
        _passo = _Passo.produto;
        _produto = null;
        _peso = null;
        _status = null;
        _lendoPeso = false;
      } else if (_passo == _Passo.produto) {
        _passo = _Passo.comanda;
        _conta = null;
        _status = null;
        _focarScanner();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MgColors.surface,
      appBar: AppBar(
        titleSpacing: 16,
        title: const Row(
          children: [
            MgLogo(height: 28),
            SizedBox(width: 12),
            Text('Estação Balança'),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Atalhos',
            onPressed: () async {
              await Navigator.of(context).pushNamed('/atalhos');
              if (!mounted) return;
              setState(() => _atalhos = widget.prefs.lerAtalhosCache());
            },
            icon: const Icon(Icons.grid_view_rounded),
          ),
          IconButton(
            tooltip: 'Configurações',
            onPressed: () => Navigator.of(context).pushNamed('/config'),
            icon: const Icon(Icons.settings_outlined),
          ),
          IconButton(
            tooltip: 'Sair',
            onPressed: () async {
              await widget.prefs.clearSession();
              if (!context.mounted) return;
              Navigator.of(context).pushReplacementNamed('/login');
            },
            icon: const Icon(Icons.logout),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Stack(
        children: [
          // Campo invisível para leitor HID (comanda)
          Positioned(
            left: -1000,
            top: 0,
            child: SizedBox(
              width: 1,
              height: 1,
              child: TextField(
                controller: _scanCtrl,
                focusNode: _scanFocus,
                autofocus: true,
                onSubmitted: _onScanComanda,
              ),
            ),
          ),
          // Toque em qualquer lugar da tela de comanda re-foca o scanner
          GestureDetector(
            behavior: HitTestBehavior.translucent,
            onTap: _passo == _Passo.comanda ? _focarScanner : null,
            child: SafeArea(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                child: switch (_passo) {
                  _Passo.comanda => _TelaComanda(
                      key: const ValueKey('comanda'),
                      busy: _busy,
                      status: _status,
                      erro: _erro,
                    ),
                  _Passo.produto => _TelaProdutos(
                      key: const ValueKey('produto'),
                      conta: _conta!,
                      atalhos: _atalhos,
                      client: widget.client,
                      onSelect: _selecionarProduto,
                      onVoltar: _voltar,
                    ),
                  _Passo.peso => _TelaPeso(
                      key: const ValueKey('peso'),
                      conta: _conta!,
                      produto: _produto!,
                      client: widget.client,
                      peso: _peso,
                      total: _total,
                      lendo: _lendoPeso,
                      busy: _busy,
                      status: _status,
                      erro: _erro,
                      onReler: () async {
                        setState(() {
                          _lendoPeso = true;
                          _erro = null;
                          _peso = null;
                          _status = 'Coloque o produto na balança';
                        });
                        await _lerPesoLoop();
                      },
                      onConfirmar: _confirmar,
                      onVoltar: _voltar,
                    ),
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TelaComanda extends StatelessWidget {
  const _TelaComanda({
    super.key,
    required this.busy,
    this.status,
    this.erro,
  });

  final bool busy;
  final String? status;
  final String? erro;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.qr_code_scanner,
              size: 72,
              color: MgColors.primary,
            ),
            const SizedBox(height: 28),
            Text(
              'Passe a comanda no leitor',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.6,
                  ),
            ),
            const SizedBox(height: 12),
            Text(
              'Aguardando leitura…',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: MgColors.mutedForeground,
                  ),
            ),
            if (busy) ...[
              const SizedBox(height: 24),
              const CircularProgressIndicator(),
            ],
            if (status != null) ...[
              const SizedBox(height: 20),
              Text(
                status!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: MgColors.mutedForeground),
              ),
            ],
            if (erro != null) ...[
              const SizedBox(height: 16),
              Text(
                erro!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: MgColors.danger),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _TelaProdutos extends StatelessWidget {
  const _TelaProdutos({
    super.key,
    required this.conta,
    required this.atalhos,
    required this.client,
    required this.onSelect,
    required this.onVoltar,
  });

  final ContaLan conta;
  final List<ProdutoLan> atalhos;
  final LanClient client;
  final ValueChanged<ProdutoLan> onSelect;
  final VoidCallback onVoltar;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Comanda ${conta.numero} — toque no produto',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
              TextButton(onPressed: onVoltar, child: const Text('Voltar')),
            ],
          ),
        ),
        if (atalhos.isEmpty)
          const Expanded(
            child: Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'Nenhum atalho cadastrado.\nAbra o ícone de grade no topo e selecione produtos KG.',
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          )
        else
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 200,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 0.82,
              ),
              itemCount: atalhos.length,
              itemBuilder: (context, index) {
                final p = atalhos[index];
                return Material(
                  color: MgColors.card,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                    side: const BorderSide(color: MgColors.border),
                  ),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(10),
                    onTap: () => onSelect(p),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Expanded(
                          child: ClipRRect(
                            borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(9),
                            ),
                            child: ProdutoImagem(client: client, produto: p),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.fromLTRB(10, 10, 10, 12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                p.descricao,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                  height: 1.2,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'R\$ ${p.preco.toStringAsFixed(2)}/kg',
                                style: const TextStyle(
                                  color: MgColors.primary,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }
}

class _TelaPeso extends StatelessWidget {
  const _TelaPeso({
    super.key,
    required this.conta,
    required this.produto,
    required this.client,
    required this.peso,
    required this.total,
    required this.lendo,
    required this.busy,
    required this.onReler,
    required this.onConfirmar,
    required this.onVoltar,
    this.status,
    this.erro,
  });

  final ContaLan conta;
  final ProdutoLan produto;
  final LanClient client;
  final double? peso;
  final double? total;
  final bool lendo;
  final bool busy;
  final VoidCallback onReler;
  final VoidCallback onConfirmar;
  final VoidCallback onVoltar;
  final String? status;
  final String? erro;

  @override
  Widget build(BuildContext context) {
    final podeConfirmar = peso != null && peso! > 0 && !busy && !lendo;

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Comanda ${conta.numero}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ),
              TextButton(onPressed: busy ? null : onVoltar, child: const Text('Voltar')),
            ],
          ),
          const SizedBox(height: 12),
          Expanded(
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: MgColors.card,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: MgColors.border),
              ),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: SizedBox(
                        height: 120,
                        width: 120,
                        child: ProdutoImagem(client: client, produto: produto),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      produto.descricao,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'R\$ ${produto.preco.toStringAsFixed(2)} / kg',
                      style: const TextStyle(
                        color: MgColors.mutedForeground,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const Spacer(),
                    if (lendo)
                      const Column(
                        children: [
                          CircularProgressIndicator(),
                          SizedBox(height: 12),
                          Text(
                            'Coloque o produto na balança',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      )
                    else ...[
                      Text(
                        peso != null
                            ? '${peso!.toStringAsFixed(3)} kg'
                            : '— — —',
                        style: Theme.of(context).textTheme.displayMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                              letterSpacing: -1.2,
                            ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        total != null
                            ? 'Total  R\$ ${total!.toStringAsFixed(2)}'
                            : 'Total  —',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              color: MgColors.primary,
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                    ],
                    if (status != null && !lendo) ...[
                      const SizedBox(height: 12),
                      Text(
                        status!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: MgColors.mutedForeground),
                      ),
                    ],
                    if (erro != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        erro!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: MgColors.danger),
                      ),
                    ],
                    const Spacer(),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: busy || lendo ? null : onReler,
                            child: const Text('Reler peso'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          flex: 2,
                          child: FilledButton(
                            onPressed: podeConfirmar ? onConfirmar : null,
                            child: busy
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Text('Confirmar'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

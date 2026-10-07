import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:uuid/uuid.dart';
import 'package:estacao_balanca/core/comanda_codigo.dart';
import 'package:estacao_balanca/core/impressora_estacao.dart';
import 'package:estacao_balanca/core/lan_client.dart';
import 'package:estacao_balanca/core/leitor_comanda.dart';
import 'package:estacao_balanca/core/models.dart';
import 'package:estacao_balanca/core/pesagem.dart';
import 'package:estacao_balanca/core/prefs.dart';
import 'package:estacao_balanca/features/balanca/balanca_facade.dart';
import 'package:estacao_balanca/theme/mg_theme.dart';
import 'package:estacao_balanca/widgets/mg_logo.dart';
import 'package:estacao_balanca/widgets/produto_imagem.dart';

enum _Passo { comanda, produto, peso, comprovante }

/// Operação touch fullscreen: bipe comanda → atalho → pesa → confirma.
class EstacaoPage extends StatefulWidget {
  const EstacaoPage({super.key, required this.prefs, required this.client});

  final AppPrefs prefs;
  final LanClient client;

  @override
  State<EstacaoPage> createState() => _EstacaoPageState();
}

class _EstacaoPageState extends State<EstacaoPage> {
  static const _uuid = Uuid();
  final _leitor = LeitorComandaBuffer();
  late final BalancaFacade _balanca;
  final ImpressoraEstacao _impressora = ImpressoraEstacao();

  _Passo _passo = _Passo.comanda;
  ContaLan? _conta;
  SessaoPesagem? _sessao;
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
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    _balanca = BalancaFacade(prefs: widget.prefs, client: widget.client);
    _atalhos = widget.prefs.lerAtalhosCache();
    // O leitor HID é lido direto das teclas (ordenadas, sem perda). Não usamos
    // mais um TextField invisível: o canal de texto perdia dígitos em rajadas.
    HardwareKeyboard.instance.addHandler(_onTeclaLeitor);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!widget.prefs.temAtalhos) {
        _avisarSemAtalhos();
      }
    });
  }

  @override
  void dispose() {
    HardwareKeyboard.instance.removeHandler(_onTeclaLeitor);
    _balanca.desconectar();
    super.dispose();
  }

  bool get _aguardandoComanda =>
      _passo == _Passo.comanda && _sessao == null;

  /// Há um campo de texto com foco (ex.: busca em "Outros produtos")?
  bool get _campoDeTextoComFoco {
    final foco = FocusManager.instance.primaryFocus?.context;
    if (foco == null) return false;
    return foco.widget is EditableText ||
        foco.findAncestorWidgetOfExactType<EditableText>() != null;
  }

  /// Só lê comanda com esta tela ativa (sem outra rota/diálogo por cima), na
  /// etapa certa e sem digitação em outro campo.
  bool get _leitorAtivo {
    if (!mounted) return false;
    if (ModalRoute.of(context)?.isCurrent == false) return false;
    if (_campoDeTextoComFoco) return false;
    return leituraComandaPermitida(
      aguardandoComanda: _aguardandoComanda,
      ocupado: _busy,
    );
  }

  bool _onTeclaLeitor(KeyEvent event) {
    if (event is KeyUpEvent) return false;
    if (!_leitorAtivo) {
      _leitor.limpar();
      return false;
    }
    final agora = DateTime.now();
    final digito = digitoDaTecla(
      character: event.character,
      tecla: event.logicalKey,
    );
    if (digito != null) {
      _leitor.adicionarDigito(digito, agora);
      return false;
    }
    if (event is KeyDownEvent && teclaEhEnter(event.logicalKey)) {
      final codigo = _leitor.finalizar(agora);
      if (codigo != null) {
        _onScanComanda(codigo);
      }
    }
    return false;
  }

  void _sincronizarLeitor() => _leitor.limpar();

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
    if (!leituraComandaPermitida(
      aguardandoComanda: _aguardandoComanda,
      ocupado: _busy,
    )) {
      return;
    }
    final digits = normalizarCodigoComanda(
      raw,
      ignorarDigitoVerificador: widget.prefs.ignorarDigitoVerificador,
    );
    final numero = int.tryParse(digits);
    if (numero == null || numero <= 0) {
      setState(() {
        _erro = 'Leitura inválida ($raw). Passe a comanda novamente.';
        _status = null;
      });
      return;
    }
    setState(() {
      _busy = true;
      _erro = null;
      _status = 'Código lido: $raw — abrindo comanda $numero…';
    });
    try {
      final conta = await widget.client.resolverComanda(numero);
      if (!mounted) return;
      setState(() {
        _conta = conta;
        _passo = _Passo.produto;
        _status = null;
      });
      _sincronizarLeitor();
    } catch (e) {
      if (!mounted) return;
      setState(() => _erro = e.toString());
      _sincronizarLeitor();
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
    _sincronizarLeitor();
    await _lerPesoLoop();
  }

  Future<void> _lerPesoLoop() async {
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

  SessaoPesagem? _montarSessao() {
    final conta = _conta;
    final produto = _produto;
    final peso = _peso;
    if (conta == null || produto == null || peso == null || peso <= 0) {
      return null;
    }
    return SessaoPesagem(
      idConta: conta.id,
      numero: conta.numero,
      idItem: _uuid.v4(),
      idProduto: produto.id,
      produtoDescricao: produto.descricao,
      pesoKg: peso,
      precoUnitario: produto.preco,
      total: produto.preco * peso,
      quando: DateTime.now(),
    );
  }

  Future<void> _confirmar() async {
    final sessao = _sessao ?? _montarSessao();
    if (sessao == null || _busy) return;
    _sessao = sessao;
    _sincronizarLeitor();
    setState(() {
      _busy = true;
      _erro = null;
      _status = 'Lançando na comanda ${sessao.numero}…';
    });
    try {
      final conta = await widget.client.adicionarItem(
        idConta: sessao.idConta,
        idItem: sessao.idItem,
        idProduto: sessao.idProduto,
        descricao: sessao.produtoDescricao,
        quantidade: sessao.pesoKg,
        precounitario: sessao.precoUnitario,
      );
      final confirmado = lancamentoConfirmado(
        ContaLancamento(
          id: conta.id,
          numero: conta.numero,
          idsItens: conta.itens.map((item) => item.id).toList(),
        ),
        sessao,
      );
      if (!confirmado) {
        if (!mounted) return;
        setState(() {
          _erro =
              'O PDV não confirmou o item na comanda ${sessao.numero}. Tente de novo.';
        });
        return;
      }
      await widget.prefs.registrarPesagem(sessao);
      SystemSound.play(SystemSoundType.click);
      if (!mounted) return;
      setState(() {
        _passo = _Passo.comprovante;
        _erro = null;
        _status = null;
        _busy = false;
      });
      await _imprimirVia();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _erro = 'Não lançado na comanda ${sessao.numero}. $e';
      });
    } finally {
      if (mounted && _passo == _Passo.peso) {
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _imprimirVia() async {
    final sessao = _sessao;
    if (sessao == null || _busy) return;
    setState(() {
      _busy = true;
      _erro = null;
      _passo = _Passo.comprovante;
    });
    try {
      await _impressora.imprimir(montarCupomPesagem(sessao));
      if (!mounted) return;
      _liberarProximaComanda();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _passo = _Passo.comprovante;
        _erro =
            'Via não impressa. O item já está na comanda ${sessao.numero}. $e';
      });
    } finally {
      if (mounted && _passo == _Passo.comprovante) {
        setState(() => _busy = false);
      }
    }
  }

  void _liberarProximaComanda() {
    setState(() {
      _sessao = null;
      _conta = null;
      _produto = null;
      _peso = null;
      _passo = _Passo.comanda;
      _busy = false;
      _lendoPeso = false;
      _erro = null;
      _status = 'Lançado! Passe a próxima comanda.';
    });
    _sincronizarLeitor();
  }

  void _voltar() {
    if (_sessao != null || _busy || _passo == _Passo.comprovante) return;
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
      }
    });
    _sincronizarLeitor();
  }

  @override
  Widget build(BuildContext context) {
    final landscape =
        MediaQuery.orientationOf(context) == Orientation.landscape;

    return Scaffold(
      backgroundColor: MgColors.surface,
      appBar: AppBar(
        toolbarHeight: landscape ? 56 : 72,
        titleSpacing: 20,
        title: Row(
          children: [
            MgLogo(height: landscape ? 28 : 36),
            const SizedBox(width: 14),
            const Text('Estação Balança'),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Histórico',
            iconSize: landscape ? 28 : 32,
            padding: EdgeInsets.all(landscape ? 12 : 16),
            onPressed: () async {
              await Navigator.of(context).pushNamed('/historico');
              if (!mounted) return;
              SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
              _sincronizarLeitor();
            },
            icon: const Icon(Icons.history),
          ),
          IconButton(
            tooltip: 'Atalhos',
            iconSize: landscape ? 28 : 32,
            padding: EdgeInsets.all(landscape ? 12 : 16),
            onPressed: () async {
              await Navigator.of(context).pushNamed('/atalhos');
              if (!mounted) return;
              setState(() => _atalhos = widget.prefs.lerAtalhosCache());
              SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
            },
            icon: const Icon(Icons.grid_view_rounded),
          ),
          IconButton(
            tooltip: 'Configurações',
            iconSize: landscape ? 28 : 32,
            padding: EdgeInsets.all(landscape ? 12 : 16),
            onPressed: () async {
              await Navigator.of(context).pushNamed('/config');
              if (!mounted) return;
              SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
            },
            icon: const Icon(Icons.settings_outlined),
          ),
          IconButton(
            tooltip: 'Sair',
            iconSize: landscape ? 28 : 32,
            padding: EdgeInsets.all(landscape ? 12 : 16),
            onPressed: () async {
              await widget.prefs.clearSession();
              if (!context.mounted) return;
              Navigator.of(context).pushReplacementNamed('/login');
            },
            icon: const Icon(Icons.logout),
          ),
          const SizedBox(width: 12),
        ],
      ),
      body: Stack(
        children: [
          GestureDetector(
            behavior: HitTestBehavior.translucent,
            onTap: () {
              SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
            },
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
                      tentarDeNovo: _sessao != null,
                      onVoltar: _sessao == null ? _voltar : null,
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
                    ),
                  _Passo.comprovante => _TelaComprovante(
                      key: const ValueKey('comprovante'),
                      cupom: _sessao == null
                          ? ''
                          : montarCupomPesagem(_sessao!),
                      busy: _busy,
                      erro: _erro,
                      onReimprimir: _imprimirVia,
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
    final landscape =
        MediaQuery.orientationOf(context) == Orientation.landscape;

    return Center(
      child: Padding(
        padding: EdgeInsets.symmetric(
          horizontal: 40,
          vertical: landscape ? 12 : 24,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.qr_code_scanner,
              size: landscape ? 88 : 120,
              color: MgColors.primary,
            ),
            SizedBox(height: landscape ? 20 : 36),
            Text(
              'Passe a comanda no leitor',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.displaySmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.8,
                    fontSize: landscape ? 32 : null,
                  ),
            ),
            const SizedBox(height: 16),
            Text(
              'Aguardando leitura…',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: MgColors.mutedForeground,
                    fontWeight: FontWeight.w600,
                    fontSize: landscape ? 20 : null,
                  ),
            ),
            if (busy) ...[
              const SizedBox(height: 28),
              const SizedBox(
                width: 48,
                height: 48,
                child: CircularProgressIndicator(strokeWidth: 4),
              ),
            ],
            if (status != null) ...[
              const SizedBox(height: 20),
              Text(
                status!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: MgColors.mutedForeground,
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
            if (erro != null) ...[
              const SizedBox(height: 16),
              Text(
                erro!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: MgColors.danger,
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                ),
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

  Future<void> _abrirOutrosProdutos(BuildContext context) async {
    final escolhido = await showModalBottomSheet<ProdutoLan>(
      context: context,
      isScrollControlled: true,
      backgroundColor: MgColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => _DialogOutrosProdutos(client: client),
    );
    if (escolhido != null) onSelect(escolhido);
  }

  @override
  Widget build(BuildContext context) {
    final landscape =
        MediaQuery.orientationOf(context) == Orientation.landscape;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(24, landscape ? 10 : 16, 24, 12),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Comanda ${conta.numero} — toque no produto',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        fontSize: landscape ? 22 : null,
                      ),
                ),
              ),
              const SizedBox(width: 12),
              SizedBox(
                height: landscape ? 48 : 56,
                child: FilledButton.tonalIcon(
                  onPressed: () => _abrirOutrosProdutos(context),
                  icon: const Icon(Icons.search, size: 22),
                  label: const Text('Outros produtos'),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                height: landscape ? 48 : 56,
                child: OutlinedButton.icon(
                  onPressed: onVoltar,
                  icon: const Icon(Icons.arrow_back, size: 24),
                  label: const Text('Voltar'),
                ),
              ),
            ],
          ),
        ),
        if (atalhos.isEmpty)
          Expanded(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'Nenhum atalho cadastrado.\nUse "Outros produtos" ou cadastre atalhos no ícone de grade.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 20, height: 1.4),
                    ),
                    const SizedBox(height: 20),
                    FilledButton.icon(
                      onPressed: () => _abrirOutrosProdutos(context),
                      icon: const Icon(Icons.search),
                      label: const Text('Outros produtos'),
                    ),
                  ],
                ),
              ),
            ),
          )
        else
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
              gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: landscape ? 220 : 260,
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                childAspectRatio: landscape ? 0.9 : 0.78,
              ),
              itemCount: atalhos.length,
              itemBuilder: (context, index) {
                final p = atalhos[index];
                return Material(
                  color: MgColors.card,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: const BorderSide(color: MgColors.border, width: 1.5),
                  ),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: () => onSelect(p),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Expanded(
                          child: ClipRRect(
                            borderRadius: const BorderRadius.vertical(
                              top: Radius.circular(13),
                            ),
                            child: ProdutoImagem(client: client, produto: p),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.fromLTRB(14, 14, 14, 16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                p.descricao,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 18,
                                  height: 1.2,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'R\$ ${p.preco.toStringAsFixed(2)}/kg',
                                style: const TextStyle(
                                  color: MgColors.primary,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 17,
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

class _DialogOutrosProdutos extends StatefulWidget {
  const _DialogOutrosProdutos({required this.client});

  final LanClient client;

  @override
  State<_DialogOutrosProdutos> createState() => _DialogOutrosProdutosState();
}

class _DialogOutrosProdutosState extends State<_DialogOutrosProdutos> {
  final _buscaCtrl = TextEditingController();
  List<ProdutoLan> _todos = [];
  List<ProdutoLan> _filtrados = [];
  bool _carregando = true;
  String? _erro;

  @override
  void initState() {
    super.initState();
    _carregar();
  }

  @override
  void dispose() {
    _buscaCtrl.dispose();
    super.dispose();
  }

  Future<void> _carregar() async {
    setState(() {
      _carregando = true;
      _erro = null;
    });
    try {
      final kg = await widget.client.listarProdutosKg();
      if (!mounted) return;
      setState(() {
        _todos = kg;
        _filtrados = kg;
        _carregando = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _erro = e.toString();
        _carregando = false;
      });
    }
  }

  void _filtrar(String q) {
    final t = q.trim().toLowerCase();
    setState(() {
      if (t.isEmpty) {
        _filtrados = _todos;
        return;
      }
      _filtrados = _todos.where((p) {
        final desc = p.descricao.toLowerCase();
        final ean = (p.ean ?? '').toLowerCase();
        final codigo = '${p.codigo ?? ''}';
        return desc.contains(t) || ean.contains(t) || codigo.contains(t);
      }).toList();
    });
  }

  @override
  Widget build(BuildContext context) {
    final h = MediaQuery.sizeOf(context).height * 0.85;
    return SizedBox(
      height: h,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 12, 8),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Outros produtos',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: TextField(
              controller: _buscaCtrl,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Buscar por nome, EAN ou código',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: _filtrar,
            ),
          ),
          const SizedBox(height: 8),
          if (_carregando)
            const Expanded(
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_erro != null)
            Expanded(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_erro!, textAlign: TextAlign.center,
                          style: const TextStyle(color: MgColors.danger)),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: _carregar,
                        child: const Text('Tentar de novo'),
                      ),
                    ],
                  ),
                ),
              ),
            )
          else if (_filtrados.isEmpty)
            const Expanded(
              child: Center(
                child: Text(
                  'Nenhum produto KG encontrado',
                  style: TextStyle(fontSize: 18),
                ),
              ),
            )
          else
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
                itemCount: _filtrados.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final p = _filtrados[index];
                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 4,
                    ),
                    leading: SizedBox(
                      width: 56,
                      height: 56,
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: ProdutoImagem(client: widget.client, produto: p),
                      ),
                    ),
                    title: Text(
                      p.descricao,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    subtitle: Text(
                      'R\$ ${p.preco.toStringAsFixed(2)}/kg'
                      '${p.codigo != null ? ' · cód. ${p.codigo}' : ''}',
                    ),
                    onTap: () => Navigator.pop(context, p),
                  );
                },
              ),
            ),
        ],
      ),
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
    this.onVoltar,
    this.tentarDeNovo = false,
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
  final VoidCallback? onVoltar;
  final bool tentarDeNovo;
  final String? status;
  final String? erro;

  @override
  Widget build(BuildContext context) {
    final podeConfirmar = peso != null && peso! > 0 && !busy && !lendo;
    final landscape =
        MediaQuery.orientationOf(context) == Orientation.landscape;
    final short = MediaQuery.sizeOf(context).height < 560;

    return Padding(
      padding: EdgeInsets.fromLTRB(24, landscape ? 8 : 12, 24, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Comanda ${conta.numero}',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        fontSize: landscape ? 22 : null,
                      ),
                ),
              ),
              SizedBox(
                height: landscape || short ? 48 : 56,
                child: OutlinedButton.icon(
                  onPressed: busy || onVoltar == null ? null : onVoltar,
                  icon: const Icon(Icons.arrow_back, size: 22),
                  label: const Text('Voltar'),
                ),
              ),
            ],
          ),
          SizedBox(height: landscape ? 10 : 16),
          Expanded(
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: MgColors.card,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: MgColors.border, width: 1.5),
              ),
              child: Padding(
                padding: EdgeInsets.fromLTRB(
                  landscape ? 20 : 28,
                  landscape ? 16 : 28,
                  landscape ? 20 : 28,
                  landscape ? 16 : 20,
                ),
                child: landscape
                    ? _conteudoLandscape(context, short: short)
                    : _conteudoPortrait(context),
              ),
            ),
          ),
          const SizedBox(height: 12),
          // Botões fixos fora do card — sempre visíveis em landscape.
          SizedBox(
            height: landscape || short ? 64 : 72,
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: busy || lendo || tentarDeNovo ? null : onReler,
                    child: const Text('Reler peso'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  flex: 2,
                  child: FilledButton(
                    onPressed: podeConfirmar ? onConfirmar : null,
                    child: busy
                        ? const SizedBox(
                            width: 28,
                            height: 28,
                            child: CircularProgressIndicator(
                              strokeWidth: 3,
                              color: Colors.white,
                            ),
                          )
                        : Text(tentarDeNovo ? 'Tentar de novo' : 'Confirmar'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _conteudoPortrait(BuildContext context) {
    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
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
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
        ),
        const SizedBox(height: 6),
        Text(
          'R\$ ${produto.preco.toStringAsFixed(2)} / kg',
          style: const TextStyle(
            color: MgColors.mutedForeground,
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
        ),
        const Spacer(),
        _blocoPeso(context, pesoFontSize: 56, totalFontSize: 32),
        const Spacer(),
      ],
    );
  }

  Widget _conteudoLandscape(BuildContext context, {required bool short}) {
    final img = short ? 88.0 : 112.0;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          flex: 4,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: SizedBox(
                  height: img,
                  width: img,
                  child: ProdutoImagem(client: client, produto: produto),
                ),
              ),
              SizedBox(height: short ? 10 : 14),
              Text(
                produto.descricao,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                      fontSize: short ? 18 : 22,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                'R\$ ${produto.preco.toStringAsFixed(2)} / kg',
                style: TextStyle(
                  color: MgColors.mutedForeground,
                  fontWeight: FontWeight.w700,
                  fontSize: short ? 15 : 17,
                ),
              ),
            ],
          ),
        ),
        Container(
          width: 1.5,
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          color: MgColors.border,
        ),
        Expanded(
          flex: 5,
          child: Center(
            child: _blocoPeso(
              context,
              pesoFontSize: short ? 44 : 56,
              totalFontSize: short ? 26 : 32,
              compact: true,
            ),
          ),
        ),
      ],
    );
  }

  Widget _blocoPeso(
    BuildContext context, {
    required double pesoFontSize,
    required double totalFontSize,
    bool compact = false,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (lendo)
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SizedBox(
                width: compact ? 40 : 48,
                height: compact ? 40 : 48,
                child: const CircularProgressIndicator(strokeWidth: 4),
              ),
              SizedBox(height: compact ? 12 : 16),
              Text(
                'Coloque o produto na balança',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: compact ? 20 : 22,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          )
        else ...[
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              peso != null ? '${peso!.toStringAsFixed(3)} kg' : '— — —',
              style: Theme.of(context).textTheme.displayLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: -1.5,
                    fontSize: pesoFontSize,
                    height: 1.05,
                  ),
            ),
          ),
          SizedBox(height: compact ? 6 : 10),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              total != null
                  ? 'Total  R\$ ${total!.toStringAsFixed(2)}'
                  : 'Total  —',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: MgColors.primary,
                    fontWeight: FontWeight.w900,
                    fontSize: totalFontSize,
                    height: 1.1,
                  ),
            ),
          ),
        ],
        if (status != null && !lendo) ...[
          SizedBox(height: compact ? 8 : 12),
          Text(
            status!,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: MgColors.mutedForeground,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
        if (erro != null) ...[
          SizedBox(height: compact ? 6 : 10),
          Text(
            erro!,
            textAlign: TextAlign.center,
            maxLines: 4,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: MgColors.danger,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ],
    );
  }
}

class _TelaComprovante extends StatelessWidget {
  const _TelaComprovante({
    super.key,
    required this.cupom,
    required this.busy,
    required this.onReimprimir,
    this.erro,
  });

  final String cupom;
  final bool busy;
  final VoidCallback onReimprimir;
  final String? erro;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Via da pesagem',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: MgColors.card,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: MgColors.border, width: 1.5),
              ),
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Text(
                  cupom,
                  style: const TextStyle(
                    fontFamily: 'Consolas',
                    fontFamilyFallback: ['Courier New', 'monospace'],
                    fontSize: 16,
                    height: 1.35,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ),
          if (erro != null) ...[
            const SizedBox(height: 12),
            Text(
              erro!,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: MgColors.danger,
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
          const SizedBox(height: 12),
          SizedBox(
            height: 64,
            child: FilledButton(
              onPressed: busy ? null : onReimprimir,
              child: busy
                  ? const SizedBox(
                      width: 28,
                      height: 28,
                      child: CircularProgressIndicator(
                        strokeWidth: 3,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Reimprimir'),
            ),
          ),
        ],
      ),
    );
  }
}

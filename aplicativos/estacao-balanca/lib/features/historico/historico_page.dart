import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:estacao_balanca/core/historico_filtro.dart';
import 'package:estacao_balanca/core/impressora_estacao.dart';
import 'package:estacao_balanca/core/pesagem.dart';
import 'package:estacao_balanca/core/prefs.dart';
import 'package:estacao_balanca/theme/mg_theme.dart';

class HistoricoPage extends StatefulWidget {
  const HistoricoPage({super.key, required this.prefs});

  final AppPrefs prefs;

  @override
  State<HistoricoPage> createState() => _HistoricoPageState();
}

class _HistoricoPageState extends State<HistoricoPage> {
  final ImpressoraEstacao _impressora = ImpressoraEstacao();
  final _comandaCtrl = TextEditingController();
  final _produtoCtrl = TextEditingController();
  late List<SessaoPesagem> _itens;
  FiltroHistorico _filtro = const FiltroHistorico();
  String? _reimprimindo;
  String? _erro;

  @override
  void initState() {
    super.initState();
    _itens = widget.prefs.lerHistoricoPesagens();
  }

  @override
  void dispose() {
    _comandaCtrl.dispose();
    _produtoCtrl.dispose();
    super.dispose();
  }

  Future<void> _reimprimir(SessaoPesagem sessao) async {
    setState(() {
      _reimprimindo = sessao.idItem;
      _erro = null;
    });
    try {
      await _impressora.imprimir(montarCupomPesagem(sessao));
    } catch (e) {
      if (!mounted) return;
      setState(() => _erro = e.toString());
    } finally {
      if (mounted) setState(() => _reimprimindo = null);
    }
  }

  String _dataCurta(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}';

  String _rotuloPeriodo(PeriodoHistorico p) {
    if (p == PeriodoHistorico.personalizado &&
        _filtro.periodo == p &&
        _filtro.inicio != null) {
      final ini = _filtro.inicio!;
      final fim = _filtro.fim ?? ini;
      return ini == fim
          ? _dataCurta(ini)
          : '${_dataCurta(ini)} – ${_dataCurta(fim)}';
    }
    return p.rotulo;
  }

  Future<void> _escolherPeriodo(PeriodoHistorico p) async {
    if (p != PeriodoHistorico.personalizado) {
      setState(() => _filtro = _filtro.copyWith(periodo: p));
      return;
    }
    final agora = DateTime.now();
    final atual = _filtro.inicio == null
        ? null
        : DateTimeRange(
            start: _filtro.inicio!,
            end: _filtro.fim ?? _filtro.inicio!,
          );
    final intervalo = await showDateRangePicker(
      context: context,
      firstDate: DateTime(agora.year - 2),
      lastDate: DateTime(agora.year, agora.month, agora.day),
      initialDateRange: atual,
      helpText: 'Período do histórico',
      saveText: 'Aplicar',
    );
    if (!mounted || intervalo == null) return;
    setState(() {
      _filtro = _filtro.copyWith(
        periodo: PeriodoHistorico.personalizado,
        inicio: intervalo.start,
        fim: intervalo.end,
      );
    });
  }

  void _limparFiltros() {
    _comandaCtrl.clear();
    _produtoCtrl.clear();
    setState(() => _filtro = const FiltroHistorico());
  }

  Widget _painelFiltros(List<SessaoPesagem> filtrados) {
    final total = totalHistorico(filtrados);
    return Card(
      color: MgColors.card,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: MgColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                for (final p in PeriodoHistorico.values)
                  ChoiceChip(
                    label: Text(_rotuloPeriodo(p)),
                    avatar: p == PeriodoHistorico.personalizado
                        ? const Icon(Icons.date_range, size: 18)
                        : null,
                    selected: _filtro.periodo == p,
                    onSelected: (_) => _escolherPeriodo(p),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                SizedBox(
                  width: 130,
                  child: TextField(
                    controller: _comandaCtrl,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: const InputDecoration(
                      labelText: 'Comanda',
                      isDense: true,
                      prefixIcon: Icon(Icons.tag),
                    ),
                    onChanged: (v) =>
                        setState(() => _filtro = _filtro.copyWith(comanda: v)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: _produtoCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Produto',
                      isDense: true,
                      prefixIcon: Icon(Icons.search),
                    ),
                    onChanged: (v) =>
                        setState(() => _filtro = _filtro.copyWith(produto: v)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Text(
                    '${filtrados.length} de ${_itens.length} lançamento(s)'
                    ' · R\$ ${total.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      color: MgColors.mutedForeground,
                    ),
                  ),
                ),
                if (_filtro.ativo)
                  TextButton.icon(
                    onPressed: _limparFiltros,
                    icon: const Icon(Icons.filter_alt_off_outlined, size: 20),
                    label: const Text('Limpar filtros'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _linha(SessaoPesagem item) {
    final ocupado = _reimprimindo == item.idItem;
    return Material(
      color: MgColors.card,
      borderRadius: BorderRadius.circular(12),
      child: ListTile(
        title: Text(
          'Comanda ${item.numero} · ${item.produtoDescricao}',
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.w800),
        ),
        subtitle: Text(
          '${formatarQuantidade(item.pesoKg, item.unidade)} · '
          'R\$ ${item.total.toStringAsFixed(2)} · '
          '${formatarDataHoraPesagem(item.quando)}',
        ),
        trailing: ocupado
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 3),
              )
            : IconButton(
                tooltip: 'Reimprimir',
                onPressed:
                    _reimprimindo == null ? () => _reimprimir(item) : null,
                icon: const Icon(Icons.print_outlined),
              ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtrados = filtrarHistorico(_itens, _filtro);
    final semDados = _itens.isEmpty;
    final semResultado = !semDados && filtrados.isEmpty;

    // Filtros dentro da lista: rolam junto e não estouram em paisagem.
    final cabecalho = <Widget>[
      if (!semDados) _painelFiltros(filtrados),
      if (_erro != null)
        Padding(
          padding: const EdgeInsets.only(top: 12),
          child: Text(
            _erro!,
            style: const TextStyle(
              color: MgColors.danger,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
    ];

    return Scaffold(
      backgroundColor: MgColors.surface,
      appBar: AppBar(
        title: const Text('Histórico de pesagens'),
      ),
      body: semDados
          ? const Center(
              child: Text(
                'Nenhuma pesagem gravada neste aparelho.',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              keyboardDismissBehavior:
                  ScrollViewKeyboardDismissBehavior.onDrag,
              itemCount: 1 + (semResultado ? 1 : filtrados.length),
              itemBuilder: (context, index) {
                if (index == 0) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Column(children: cabecalho),
                  );
                }
                if (semResultado) {
                  return const Padding(
                    padding: EdgeInsets.only(top: 32),
                    child: Center(
                      child: Text(
                        'Nenhum lançamento com esses filtros.',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  );
                }
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _linha(filtrados[index - 1]),
                );
              },
            ),
    );
  }
}

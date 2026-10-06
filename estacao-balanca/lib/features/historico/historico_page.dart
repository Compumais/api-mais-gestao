import 'package:flutter/material.dart';
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
  late List<SessaoPesagem> _itens;
  String? _reimprimindo;
  String? _erro;

  @override
  void initState() {
    super.initState();
    _itens = widget.prefs.lerHistoricoPesagens();
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MgColors.surface,
      appBar: AppBar(
        title: const Text('Histórico de pesagens'),
      ),
      body: Column(
        children: [
          if (_erro != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Text(
                _erro!,
                style: const TextStyle(
                  color: MgColors.danger,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          Expanded(
            child: _itens.isEmpty
                ? const Center(
                    child: Text(
                      'Nenhuma pesagem gravada neste aparelho.',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _itens.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final item = _itens[index];
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
                            '${item.pesoKg.toStringAsFixed(3)} kg · '
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
                                  onPressed: _reimprimindo == null
                                      ? () => _reimprimir(item)
                                      : null,
                                  icon: const Icon(Icons.print_outlined),
                                ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:estacao_balanca/core/lan_client.dart';
import 'package:estacao_balanca/core/models.dart';
import 'package:estacao_balanca/core/prefs.dart';
import 'package:estacao_balanca/theme/mg_theme.dart';
import 'package:estacao_balanca/widgets/produto_imagem.dart';

/// Cadastro de atalhos da estação: somente produtos em KG do catálogo do PDV.
class AtalhosPage extends StatefulWidget {
  const AtalhosPage({super.key, required this.prefs, required this.client});

  final AppPrefs prefs;
  final LanClient client;

  @override
  State<AtalhosPage> createState() => _AtalhosPageState();
}

class _AtalhosPageState extends State<AtalhosPage> {
  final _buscaCtrl = TextEditingController();
  List<ProdutoLan> _kg = [];
  final Set<String> _selecionados = {};
  bool _loading = true;
  String? _erro;

  @override
  void initState() {
    super.initState();
    _selecionados.addAll(widget.prefs.atalhoIds);
    _carregar();
  }

  @override
  void dispose() {
    _buscaCtrl.dispose();
    super.dispose();
  }

  Future<void> _carregar() async {
    setState(() {
      _loading = true;
      _erro = null;
    });
    try {
      final kg = await widget.client.listarProdutosKg();
      if (!mounted) return;
      setState(() {
        _kg = kg;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _erro = e.toString();
        _loading = false;
      });
    }
  }

  List<ProdutoLan> get _filtrados {
    final q = _buscaCtrl.text.trim().toLowerCase();
    if (q.isEmpty) return _kg;
    return _kg.where((p) {
      return p.descricao.toLowerCase().contains(q) ||
          (p.ean ?? '').toLowerCase().contains(q) ||
          '${p.codigo ?? ''}'.contains(q);
    }).toList();
  }

  Future<void> _salvar() async {
    final ids = _selecionados.toList();
    final escolhidos = _kg.where((p) => ids.contains(p.id)).toList();
    // Mantém a ordem de seleção do catálogo filtrado
    escolhidos.sort((a, b) => ids.indexOf(a.id).compareTo(ids.indexOf(b.id)));
    await widget.prefs.setAtalhoIds(escolhidos.map((p) => p.id).toList());
    await widget.prefs.salvarAtalhosCache(escolhidos);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${escolhidos.length} atalho(s) salvos'),
        backgroundColor: MgColors.primary,
      ),
    );
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: MgColors.surface,
      appBar: AppBar(
        title: const Text('Atalhos (produtos KG)'),
        actions: [
          TextButton(
            onPressed: _loading ? null : _salvar,
            child: Text('Salvar (${_selecionados.length})'),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _buscaCtrl,
              decoration: const InputDecoration(
                labelText: 'Buscar produto KG',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'Marque os produtos que aparecerão como cards na estação. '
              'Somente unidades de medida em quilograma.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: MgColors.mutedForeground,
                  ),
            ),
          ),
          const SizedBox(height: 8),
          if (_loading)
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
                      Text(_erro!, textAlign: TextAlign.center),
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
                  'Nenhum produto KG encontrado no catálogo do PDV.',
                  textAlign: TextAlign.center,
                ),
              ),
            )
          else
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                itemCount: _filtrados.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final p = _filtrados[index];
                  final marcado = _selecionados.contains(p.id);
                  return Material(
                    color: MgColors.card,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                      side: BorderSide(
                        color: marcado ? MgColors.primary : MgColors.border,
                        width: marcado ? 2 : 1,
                      ),
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(8),
                      onTap: () {
                        setState(() {
                          if (marcado) {
                            _selecionados.remove(p.id);
                          } else {
                            _selecionados.add(p.id);
                          }
                        });
                      },
                      child: Padding(
                        padding: const EdgeInsets.all(10),
                        child: Row(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: SizedBox(
                                width: 56,
                                height: 56,
                                child: ProdutoImagem(
                                  client: widget.client,
                                  produto: p,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    p.descricao,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'R\$ ${p.preco.toStringAsFixed(2)} / kg'
                                    '${p.unidademedida != null ? ' · ${p.unidademedida}' : ''}',
                                    style: const TextStyle(
                                      color: MgColors.mutedForeground,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Checkbox(
                              value: marcado,
                              activeColor: MgColors.primary,
                              onChanged: (v) {
                                setState(() {
                                  if (v == true) {
                                    _selecionados.add(p.id);
                                  } else {
                                    _selecionados.remove(p.id);
                                  }
                                });
                              },
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: FilledButton(
                onPressed: _loading ? null : _salvar,
                child: Text('Salvar atalhos (${_selecionados.length})'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

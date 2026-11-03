import 'package:flutter/material.dart';

import '../pdv/dinheiro.dart';
import '../pdv/modelos.dart';
import 'tema.dart';

class ContaPage extends StatelessWidget {
  const ContaPage({
    super.key,
    required this.comanda,
    required this.conta,
    required this.carregando,
    required this.erro,
    required this.pagando,
    required this.aoPagar,
    required this.aoVoltar,
  });

  final bool comanda;
  final ContaDetalhe? conta;
  final bool carregando;
  final String? erro;
  final bool pagando;
  final Future<void> Function(String funcao) aoPagar;
  final VoidCallback aoVoltar;

  @override
  Widget build(BuildContext context) {
    final atual = conta;
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: pagando ? null : aoVoltar,
        ),
        title: Text(atual == null ? 'Conta' : rotuloConta(comanda, atual.numero)),
      ),
      body: carregando && atual == null
          ? const Center(child: CircularProgressIndicator())
          : atual == null
              ? Center(child: Text(erro ?? 'Conta indisponível.'))
              : Column(
                  children: [
                    Expanded(
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          if (atual.nomeCliente != null)
                            Text(
                              atual.nomeCliente!,
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                          if (erro != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: Text(
                                erro!,
                                style: TextStyle(color: Theme.of(context).colorScheme.error),
                              ),
                            ),
                          const SizedBox(height: 12),
                          for (final item in atual.itens)
                            ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text(
                                item.descricao,
                                style: item.pago
                                    ? const TextStyle(decoration: TextDecoration.lineThrough)
                                    : null,
                              ),
                              subtitle: item.observacao == null ? null : Text(item.observacao!),
                              trailing: Text(reais(item.precoTotal)),
                              leading: Text(_quantidade(item.quantidade)),
                            ),
                        ],
                      ),
                    ),
                    Material(
                      elevation: 8,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'A pagar ${reais(atual.aPagar)}',
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            const SizedBox(height: 12),
                            FilledButton(
                              onPressed: pagando || atual.aPagar <= 0
                                  ? null
                                  : () => _escolher(context),
                              child: Text(pagando ? 'Aguardando o TEF...' : 'Pagar'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }

  Future<void> _escolher(BuildContext context) async {
    final funcao = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                title: const Text('Débito'),
                onTap: () => Navigator.pop(context, 'debito'),
              ),
              ListTile(
                title: const Text('Crédito à vista'),
                onTap: () => Navigator.pop(context, 'credito'),
              ),
              ListTile(
                title: const Text('PIX'),
                onTap: () => Navigator.pop(context, 'pix'),
              ),
            ],
          ),
        );
      },
    );
    if (funcao != null) {
      await aoPagar(funcao);
    }
  }

  String _quantidade(double quantidade) {
    if (quantidade == quantidade.roundToDouble()) {
      return '${quantidade.round()}x';
    }
    return '${valorTef(quantidade).replaceAll('.', ',')}x';
  }
}

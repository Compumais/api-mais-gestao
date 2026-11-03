import 'package:flutter/material.dart';

import '../pdv/dinheiro.dart';
import 'tema.dart';

class ResultadoPage extends StatelessWidget {
  const ResultadoPage({
    super.key,
    required this.comanda,
    required this.numero,
    required this.valor,
    required this.nsu,
    this.viaCliente,
    required this.aoVoltar,
  });

  final bool comanda;
  final int numero;
  final double valor;
  final String nsu;
  final String? viaCliente;
  final VoidCallback aoVoltar;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pagamento concluído')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            '${rotuloConta(comanda, numero)} paga',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(reais(valor), style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 8),
          Text('NSU $nsu'),
          if (viaCliente != null) ...[
            const SizedBox(height: 16),
            Text(viaCliente!),
          ],
          const SizedBox(height: 24),
          FilledButton(
            onPressed: aoVoltar,
            child: const Text('Voltar às contas'),
          ),
        ],
      ),
    );
  }
}

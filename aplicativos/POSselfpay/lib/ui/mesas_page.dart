import 'package:flutter/material.dart';

import '../pdv/dinheiro.dart';
import '../pdv/modelos.dart';
import 'tema.dart';

class MesasPage extends StatelessWidget {
  const MesasPage({
    super.key,
    required this.comanda,
    required this.mesas,
    required this.carregando,
    required this.erro,
    required this.pendente,
    required this.aoAtualizar,
    required this.aoAbrir,
    required this.aoAjustes,
    required this.aoSair,
    required this.aoConcluirPendente,
  });

  final bool comanda;
  final List<MesaResumo> mesas;
  final bool carregando;
  final String? erro;
  final FechamentoPendente? pendente;
  final Future<void> Function() aoAtualizar;
  final void Function(MesaResumo mesa) aoAbrir;
  final VoidCallback aoAjustes;
  final VoidCallback aoSair;
  final VoidCallback aoConcluirPendente;

  @override
  Widget build(BuildContext context) {
    final titulo = comanda ? 'Comandas abertas' : 'Mesas abertas';
    return Scaffold(
      appBar: AppBar(
        title: Text(titulo),
        actions: [
          IconButton(
            tooltip: 'Atualizar',
            onPressed: carregando ? null : aoAtualizar,
            icon: const Icon(Icons.refresh),
          ),
          IconButton(
            tooltip: 'Ajustes',
            onPressed: aoAjustes,
            icon: const Icon(Icons.settings),
          ),
          IconButton(
            tooltip: 'Sair',
            onPressed: aoSair,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: aoAtualizar,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (pendente != null)
              Card(
                color: const Color(0xFFFFF4D6),
                child: ListTile(
                  title: Text(
                    'Pagamento aprovado em ${rotuloConta(comanda, pendente!.numero)}',
                  ),
                  subtitle: Text('NSU ${pendente!.nsu}. Falta registrar no PDV.'),
                  trailing: FilledButton(
                    onPressed: aoConcluirPendente,
                    child: const Text('Concluir'),
                  ),
                ),
              ),
            if (erro != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(erro!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
              ),
            if (carregando)
              const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (mesas.isEmpty)
              const Padding(
                padding: EdgeInsets.all(32),
                child: Text('Nenhuma conta com saldo para pagar.'),
              )
            else
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                  maxCrossAxisExtent: 220,
                  mainAxisExtent: 140,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                itemCount: mesas.length,
                itemBuilder: (context, index) {
                  final mesa = mesas[index];
                  final nome = mesa.nomeCliente;
                  return Card(
                    clipBehavior: Clip.antiAlias,
                    child: InkWell(
                      onTap: () => aoAbrir(mesa),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${mesa.numero}',
                              style: Theme.of(context).textTheme.headlineMedium,
                            ),
                            if (nome != null) Text(nome, maxLines: 1, overflow: TextOverflow.ellipsis),
                            const Spacer(),
                            Text(
                              reais(mesa.valorTotal),
                              style: const TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}

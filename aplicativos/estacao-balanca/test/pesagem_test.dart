import 'package:estacao_balanca/core/pesagem.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final sessao = SessaoPesagem(
    idConta: 'conta-10',
    numero: 10,
    idItem: 'item-1',
    idProduto: 'prod-1',
    produtoDescricao: 'Picanha fatiada',
    pesoKg: 0.35,
    precoUnitario: 70,
    total: 24.5,
    quando: DateTime(2026, 10, 4, 23, 21),
  );

  test('leitura fora do passo da comanda é ignorada', () {
    expect(
      leituraComandaPermitida(aguardandoComanda: false, ocupado: false),
      isFalse,
    );
    expect(
      leituraComandaPermitida(aguardandoComanda: true, ocupado: true),
      isFalse,
    );
    expect(
      leituraComandaPermitida(aguardandoComanda: true, ocupado: false),
      isTrue,
    );
  });

  test('outra conta ou item ausente não libera a próxima pesagem', () {
    expect(
      lancamentoConfirmado(
        const ContaLancamento(
          id: 'conta-12',
          numero: 12,
          idsItens: ['item-1'],
        ),
        sessao,
      ),
      isFalse,
    );
    expect(
      lancamentoConfirmado(
        const ContaLancamento(
          id: 'conta-10',
          numero: 10,
          idsItens: ['outro'],
        ),
        sessao,
      ),
      isFalse,
    );
    expect(
      lancamentoConfirmado(
        const ContaLancamento(
          id: 'conta-10',
          numero: 10,
          idsItens: ['item-1'],
        ),
        sessao,
      ),
      isTrue,
    );
  });

  test('cupom cabe em 32 colunas e traz os cinco campos', () {
    final cupom = montarCupomPesagem(
      SessaoPesagem(
        idConta: sessao.idConta,
        numero: sessao.numero,
        idItem: sessao.idItem,
        idProduto: sessao.idProduto,
        produtoDescricao:
            'Contra file especial muito longo para uma linha so',
        pesoKg: sessao.pesoKg,
        precoUnitario: sessao.precoUnitario,
        total: sessao.total,
        quando: sessao.quando,
      ),
    );
    final linhas = cupom.split('\n');
    expect(linhas.every((linha) => linha.length <= 32), isTrue);
    expect(cupom, contains('Comanda: 10'));
    expect(cupom, contains('Produto:'));
    expect(cupom, contains('Contra'));
    expect(cupom, contains('Peso: 0.350 kg'));
    expect(cupom, contains('Total: R\$ 24.50'));
    expect(cupom, contains('Data: 04/10/2026 23:21'));
  });
}

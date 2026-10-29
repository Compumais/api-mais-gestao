import 'package:estacao_balanca/core/historico_filtro.dart';
import 'package:estacao_balanca/core/pesagem.dart';
import 'package:flutter_test/flutter_test.dart';

SessaoPesagem _s(String id, int comanda, String produto, DateTime quando,
        {double total = 10}) =>
    SessaoPesagem(
      idConta: 'c$comanda',
      numero: comanda,
      idItem: id,
      idProduto: 'p',
      produtoDescricao: produto,
      pesoKg: 1,
      precoUnitario: total,
      total: total,
      quando: quando,
    );

void main() {
  final agora = DateTime(2026, 10, 7, 15, 30);
  final itens = [
    _s('a', 1, 'Picanha', DateTime(2026, 10, 7, 12), total: 50),
    _s('b', 12, 'Pão de Queijo', DateTime(2026, 10, 7, 0, 0), total: 8),
    _s('c', 101, 'Picanha', DateTime(2026, 10, 6, 23, 59), total: 40),
    _s('d', 1, 'Costela', DateTime(2026, 10, 1, 9), total: 30),
    _s('e', 7, 'Salada', DateTime(2026, 9, 20, 9), total: 5),
  ];

  List<String> ids(FiltroHistorico f) =>
      filtrarHistorico(itens, f, agora: agora).map((s) => s.idItem).toList();

  test('sem filtro devolve tudo e não está ativo', () {
    expect(const FiltroHistorico().ativo, isFalse);
    expect(ids(const FiltroHistorico()), ['a', 'b', 'c', 'd', 'e']);
  });

  test('hoje inclui meia-noite e exclui 23:59 de ontem', () {
    expect(ids(const FiltroHistorico(periodo: PeriodoHistorico.hoje)),
        ['a', 'b']);
  });

  test('ontem', () {
    expect(ids(const FiltroHistorico(periodo: PeriodoHistorico.ontem)), ['c']);
  });

  test('7 dias conta hoje + 6 dias anteriores', () {
    expect(ids(const FiltroHistorico(periodo: PeriodoHistorico.ultimos7)),
        ['a', 'b', 'c', 'd']);
  });

  test('personalizado é inclusivo e aceita datas invertidas', () {
    final f = FiltroHistorico(
      periodo: PeriodoHistorico.personalizado,
      inicio: DateTime(2026, 10, 7),
      fim: DateTime(2026, 10, 1),
    );
    expect(ids(f), ['a', 'b', 'c', 'd']);
    final umDia = FiltroHistorico(
      periodo: PeriodoHistorico.personalizado,
      inicio: DateTime(2026, 10, 6),
    );
    expect(ids(umDia), ['c']);
  });

  test('comanda compara o número inteiro, não um trecho', () {
    expect(ids(const FiltroHistorico(comanda: '1')), ['a', 'd']);
    expect(ids(const FiltroHistorico(comanda: '101')), ['c']);
    expect(ids(const FiltroHistorico(comanda: 'abc')), isEmpty);
  });

  test('produto ignora acento e caixa', () {
    expect(ids(const FiltroHistorico(produto: 'PAO')), ['b']);
    expect(ids(const FiltroHistorico(produto: 'picanha')), ['a', 'c']);
  });

  test('filtros se combinam e o total soma só o resultado', () {
    const f = FiltroHistorico(
      periodo: PeriodoHistorico.ultimos7,
      produto: 'picanha',
    );
    final r = filtrarHistorico(itens, f, agora: agora);
    expect(r.map((s) => s.idItem), ['a', 'c']);
    expect(totalHistorico(r), 90);
    expect(f.ativo, isTrue);
  });
}

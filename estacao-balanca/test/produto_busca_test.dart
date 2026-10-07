import 'package:estacao_balanca/core/models.dart';
import 'package:estacao_balanca/core/pesagem.dart';
import 'package:estacao_balanca/core/produto_busca.dart';
import 'package:flutter_test/flutter_test.dart';

ProdutoLan _p(String id, String nome,
        {String? un, String? ean, int? codigo, double preco = 10}) =>
    ProdutoLan(
      id: id,
      descricao: nome,
      preco: preco,
      unidademedida: un,
      ean: ean,
      codigo: codigo,
    );

void main() {
  final catalogo = [
    _p('1', 'Refrigerante Cola 2L', un: 'UN', ean: '789100', codigo: 12),
    _p('2', 'Picanha', un: 'KG', codigo: 7),
    _p('3', 'Pão de Queijo', un: 'UN', codigo: 30),
  ];

  group('filtrarProdutos', () {
    test('sem consulta devolve tudo (não só KG)', () {
      expect(filtrarProdutos(catalogo, '  '), hasLength(3));
    });

    test('ignora acento e caixa', () {
      expect(filtrarProdutos(catalogo, 'PAO').map((p) => p.id), ['3']);
      expect(filtrarProdutos(catalogo, 'pão de').map((p) => p.id), ['3']);
    });

    test('busca por código e EAN', () {
      expect(filtrarProdutos(catalogo, '12').map((p) => p.id), ['1']);
      expect(filtrarProdutos(catalogo, '789100').map((p) => p.id), ['1']);
    });

    test('todos os termos precisam bater', () {
      expect(filtrarProdutos(catalogo, 'cola 2l').map((p) => p.id), ['1']);
      expect(filtrarProdutos(catalogo, 'cola picanha'), isEmpty);
    });
  });

  group('lerQuantidade', () {
    test('aceita vírgula e ponto', () {
      expect(lerQuantidade('2'), 2);
      expect(lerQuantidade('1,5'), 1.5);
      expect(lerQuantidade('1.5'), 1.5);
      expect(lerQuantidade('1.250,5'), 1250.5);
    });

    test('rejeita inválido, zero e negativo', () {
      expect(lerQuantidade(''), isNull);
      expect(lerQuantidade('abc'), isNull);
      expect(lerQuantidade('0'), isNull);
      expect(lerQuantidade('-1'), isNull);
    });
  });

  group('formatação', () {
    test('preço com vírgula e /kg só para peso', () {
      expect(formatarPrecoProduto(_p('a', 'X', un: 'UN', preco: 12.5)), 'R\$ 12,50');
      expect(formatarPrecoProduto(_p('b', 'Y', un: 'KG', preco: 59.9)), 'R\$ 59,90/kg');
    });

    test('quantidade', () {
      expect(formatarQuantidade(1.25, 'kg'), '1.250 kg');
      expect(formatarQuantidade(3, 'un'), '3 un');
      expect(formatarQuantidade(1.5, 'cx'), '1,5 cx');
    });

    test('sessão antiga sem unidade é tratada como kg', () {
      final s = SessaoPesagem.fromJson({
        'idConta': 'c',
        'numero': 1,
        'idItem': 'i',
        'idProduto': 'p',
        'produto': 'Picanha',
        'peso': 1.2,
        'preco': 10,
        'total': 12,
      });
      expect(s.unidade, 'kg');
      expect(s.porPeso, isTrue);
    });
  });
}

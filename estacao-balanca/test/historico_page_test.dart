import 'package:estacao_balanca/core/pesagem.dart';
import 'package:estacao_balanca/core/prefs.dart';
import 'package:estacao_balanca/features/historico/historico_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

SessaoPesagem _s(String id, int comanda, String produto, DateTime quando) =>
    SessaoPesagem(
      idConta: 'c$comanda',
      numero: comanda,
      idItem: id,
      idProduto: 'p',
      produtoDescricao: produto,
      pesoKg: 1,
      precoUnitario: 10,
      total: 10,
      quando: quando,
    );

void main() {
  testWidgets('filtra por comanda e produto e limpa os filtros', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = AppPrefs(await SharedPreferences.getInstance());
    final agora = DateTime.now();
    await prefs.registrarPesagem(_s('a', 1, 'Picanha', agora));
    await prefs.registrarPesagem(_s('b', 12, 'Costela', agora));
    await prefs.registrarPesagem(
      _s('c', 7, 'Salada', agora.subtract(const Duration(days: 30))),
    );

    await tester.pumpWidget(MaterialApp(home: HistoricoPage(prefs: prefs)));

    expect(find.text('3 de 3 lançamento(s) · R\$ 30.00'), findsOneWidget);
    expect(find.text('Limpar filtros'), findsNothing);

    await tester.tap(find.text('Hoje'));
    await tester.pump();
    expect(find.text('2 de 3 lançamento(s) · R\$ 20.00'), findsOneWidget);
    expect(find.text('Limpar filtros'), findsOneWidget);

    await tester.enterText(find.widgetWithText(TextField, 'Comanda'), '1');
    await tester.pump();
    expect(find.text('1 de 3 lançamento(s) · R\$ 10.00'), findsOneWidget);
    expect(find.textContaining('Picanha'), findsOneWidget);
    expect(find.textContaining('Costela'), findsNothing);

    await tester.enterText(find.widgetWithText(TextField, 'Produto'), 'xyz');
    await tester.pump();
    expect(find.text('Nenhum lançamento com esses filtros.'), findsOneWidget);

    await tester.tap(find.text('Limpar filtros'));
    await tester.pump();
    expect(find.text('3 de 3 lançamento(s) · R\$ 30.00'), findsOneWidget);
  });
}

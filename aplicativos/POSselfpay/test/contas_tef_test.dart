import 'package:flutter_test/flutter_test.dart';
import 'package:pos_selfpay/pdv/dinheiro.dart';
import 'package:pos_selfpay/pdv/modelos.dart';
import 'package:pos_selfpay/tef/pagamento_fechamento.dart';
import 'package:pos_selfpay/tef/retorno_tef.dart';

void main() {
  test('lista só conta ocupada com saldo', () {
    final mesas = filtrarContasAbertas(const [
      MesaResumo(
        numero: 1,
        status: 'livre',
        idConta: null,
        nomeCliente: null,
        valorTotal: 0,
        qtdItens: 0,
      ),
      MesaResumo(
        numero: 2,
        status: 'ocupada',
        idConta: 'abc',
        nomeCliente: 'Ana',
        valorTotal: 0,
        qtdItens: 0,
      ),
      MesaResumo(
        numero: 3,
        status: 'ocupada',
        idConta: '',
        nomeCliente: null,
        valorTotal: 10,
        qtdItens: 1,
      ),
      MesaResumo(
        numero: 4,
        status: 'ocupada',
        idConta: 'conta-4',
        nomeCliente: 'Bia',
        valorTotal: 45,
        qtdItens: 2,
      ),
    ]);

    expect(mesas.map((mesa) => mesa.numero), [4]);
  });

  test('crédito à vista manda parcelas e financiamento', () {
    expect(
      extrasTransacao(funcao: 'credito', valor: valorTef(45)),
      {
        'funcao': 'credito',
        'valor': '45.00',
        'parcelas': '1',
        'financiamento': '1',
      },
    );
    expect(extrasTransacao(funcao: 'debito', valor: '10.50')['parcelas'], isNull);
    expect(extrasTransacao(funcao: 'pix', valor: '13.00'), {
      'funcao': 'pix',
      'valor': '13.00',
    });
  });

  test('retorno sem NSU ou cancelado não aprova', () {
    final cancelado = interpretarRetorno(
      resultCode: 0,
      extras: const {'nsu': '123'},
    );
    expect(cancelado.aprovado, isFalse);

    final semNsu = interpretarRetorno(
      resultCode: resultadoOkAndroid,
      extras: const {'mensagem': 'negada'},
    );
    expect(semNsu.aprovado, isFalse);
    expect(semNsu.mensagem, 'negada');
  });

  test('lê NSU dentro do JSON de resultado', () {
    const json = '''
{"funcao":"debito","mensagem":"ok","resultado":{"nsu":"000144","autorizacao":"A1","administradora":"VISA","viaCliente":"VIA"}}
''';
    final retorno = interpretarRetorno(
      resultCode: resultadoOkAndroid,
      extras: const {'retorno': json},
    );
    expect(retorno.aprovado, isTrue);
    expect(retorno.nsu, '000144');
    expect(retorno.autorizacao, 'A1');
    expect(retorno.bandeira, 'VISA');
    expect(retorno.viaCliente, 'VIA');
  });

  test('débito fecha como cartão com tPag 04', () {
    final pagamento = pagamentoFechamento(
      funcao: 'debito',
      valor: 45,
      nsu: '000144',
      autorizacao: 'A1',
      bandeira: 'VISA',
    );
    expect(pagamento['meio'], 'CARTAO');
    expect(pagamento['formapagamentonfe'], '04');
    expect(pagamento['valor'], 45);
    expect(pagamento['nsu'], '000144');

    final pix = pagamentoFechamento(
      funcao: 'pix',
      valor: 13,
      nsu: 'pix-1',
      autorizacao: null,
      bandeira: null,
    );
    expect(pix['meio'], 'PIX');
    expect(pix['formapagamentonfe'], '17');
  });
}

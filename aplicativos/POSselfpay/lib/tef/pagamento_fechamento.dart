import '../pdv/dinheiro.dart';
import '../pdv/modelos.dart';

Map<String, dynamic> pagamentoFechamento({
  required String funcao,
  required double valor,
  required String? nsu,
  required String? autorizacao,
  required String? bandeira,
}) {
  final pix = funcao == 'pix';
  final pagamento = <String, dynamic>{
    'meio': pix ? 'PIX' : 'CARTAO',
    'valor': double.parse(valorTef(valor)),
    'status': 'ok',
    'formapagamentonfe': pix ? '17' : (funcao == 'debito' ? '04' : '03'),
  };
  if (nsu != null && nsu.isNotEmpty) {
    pagamento['nsu'] = nsu;
  }
  if (autorizacao != null && autorizacao.isNotEmpty) {
    pagamento['autorizacao'] = autorizacao;
  }
  if (bandeira != null && bandeira.isNotEmpty) {
    pagamento['bandeira'] = bandeira;
  }
  return pagamento;
}

Map<String, dynamic> pagamentoDoPendente(FechamentoPendente pendente) {
  return pagamentoFechamento(
    funcao: pendente.funcao,
    valor: pendente.valor,
    nsu: pendente.nsu,
    autorizacao: pendente.autorizacao,
    bandeira: pendente.bandeira,
  );
}

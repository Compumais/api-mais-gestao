const larguraCupomPesagem = 32;

/// Snapshot congelado no momento de confirmar: a tela pode mudar,
/// o lançamento continua nesta comanda e neste item.
class SessaoPesagem {
  const SessaoPesagem({
    required this.idConta,
    required this.numero,
    required this.idItem,
    required this.idProduto,
    required this.produtoDescricao,
    required this.pesoKg,
    required this.precoUnitario,
    required this.total,
    required this.quando,
  });

  final String idConta;
  final int numero;
  final String idItem;
  final String idProduto;
  final String produtoDescricao;
  final double pesoKg;
  final double precoUnitario;
  final double total;
  final DateTime quando;

  Map<String, dynamic> toJson() => {
        'idConta': idConta,
        'numero': numero,
        'idItem': idItem,
        'idProduto': idProduto,
        'produto': produtoDescricao,
        'peso': pesoKg,
        'preco': precoUnitario,
        'total': total,
        'quando': quando.toIso8601String(),
      };

  factory SessaoPesagem.fromJson(Map<String, dynamic> json) {
    return SessaoPesagem(
      idConta: '${json['idConta'] ?? ''}',
      numero: (json['numero'] as num?)?.toInt() ?? 0,
      idItem: '${json['idItem'] ?? ''}',
      idProduto: '${json['idProduto'] ?? ''}',
      produtoDescricao: '${json['produto'] ?? ''}',
      pesoKg: (json['peso'] as num?)?.toDouble() ?? 0,
      precoUnitario: (json['preco'] as num?)?.toDouble() ?? 0,
      total: (json['total'] as num?)?.toDouble() ?? 0,
      quando: DateTime.tryParse('${json['quando'] ?? ''}') ?? DateTime.now(),
    );
  }
}

class ContaLancamento {
  const ContaLancamento({
    required this.id,
    required this.numero,
    required this.idsItens,
  });

  final String id;
  final int numero;
  final List<String> idsItens;
}

/// O leitor só vale na tela “passe a comanda”, e nunca com um lançamento em curso.
bool leituraComandaPermitida({
  required bool aguardandoComanda,
  required bool ocupado,
}) {
  return aguardandoComanda && !ocupado;
}

/// Só libera a próxima pesagem se a resposta for a mesma conta da leitura
/// e o item enviado estiver nela.
bool lancamentoConfirmado(ContaLancamento conta, SessaoPesagem sessao) {
  if (conta.id.isEmpty || conta.id != sessao.idConta) return false;
  if (conta.numero != sessao.numero) return false;
  if (sessao.idItem.isEmpty) return false;
  return conta.idsItens.contains(sessao.idItem);
}

String formatarDataHoraPesagem(DateTime quando) {
  String dois(int n) => n.toString().padLeft(2, '0');
  return '${dois(quando.day)}/${dois(quando.month)}/${quando.year} '
      '${dois(quando.hour)}:${dois(quando.minute)}';
}

/// Cupom de 32 colunas (papel de 48 mm).
String montarCupomPesagem(SessaoPesagem sessao) {
  final separador = '=' * larguraCupomPesagem;
  final linhas = <String>[
    separador,
    _centralizar('PESAGEM'),
    separador,
    ..._campo('Comanda', '${sessao.numero}'),
    ..._campo('Produto', sessao.produtoDescricao),
    ..._campo('Peso', '${sessao.pesoKg.toStringAsFixed(3)} kg'),
    ..._campo('Total', 'R\$ ${sessao.total.toStringAsFixed(2)}'),
    ..._campo('Data', formatarDataHoraPesagem(sessao.quando)),
    separador,
  ];
  return linhas.join('\n');
}

String _centralizar(String texto) {
  final limpo = texto.trim();
  if (limpo.length >= larguraCupomPesagem) {
    return limpo.substring(0, larguraCupomPesagem);
  }
  final esquerda = (larguraCupomPesagem - limpo.length) ~/ 2;
  return '${' ' * esquerda}$limpo';
}

List<String> _campo(String rotulo, String valor) {
  final prefixo = '$rotulo: ';
  final texto = valor.trim().isEmpty ? '-' : valor.trim();
  final palavras = texto.split(RegExp(r'\s+'));
  final linhas = <String>[];
  var atual = prefixo;

  for (final palavra in palavras) {
    final pedaco = palavra.length > larguraCupomPesagem
        ? palavra.substring(0, larguraCupomPesagem)
        : palavra;
    final candidato = atual == prefixo ? '$prefixo$pedaco' : '$atual $pedaco';
    if (candidato.length <= larguraCupomPesagem) {
      atual = candidato;
      continue;
    }
    if (atual.trim().isNotEmpty) linhas.add(atual);
    atual = pedaco;
  }
  if (atual.isNotEmpty) linhas.add(atual);
  if (linhas.isEmpty) linhas.add(prefixo.trim());
  return linhas;
}

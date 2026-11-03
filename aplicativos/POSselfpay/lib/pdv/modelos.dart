import 'dinheiro.dart';

class MesaResumo {
  const MesaResumo({
    required this.numero,
    required this.status,
    required this.idConta,
    required this.nomeCliente,
    required this.valorTotal,
    required this.qtdItens,
  });

  final int numero;
  final String status;
  final String? idConta;
  final String? nomeCliente;
  final double valorTotal;
  final int qtdItens;

  bool get ocupadaComSaldo =>
      status == 'ocupada' &&
      idConta != null &&
      idConta!.isNotEmpty &&
      valorTotal > 0.009;

  factory MesaResumo.fromJson(Map<String, dynamic> json) {
    final id = json['idconta']?.toString().trim();
    return MesaResumo(
      numero: lerNumero(json['numero']).round(),
      status: json['status']?.toString() ?? '',
      idConta: id == null || id.isEmpty ? null : id,
      nomeCliente: _texto(json['nomecliente']),
      valorTotal: lerNumero(json['valortotal']),
      qtdItens: lerNumero(json['qtdItens']).round(),
    );
  }
}

class ItemConta {
  const ItemConta({
    required this.descricao,
    required this.quantidade,
    required this.precoTotal,
    required this.pago,
    this.observacao,
  });

  final String descricao;
  final double quantidade;
  final double precoTotal;
  final bool pago;
  final String? observacao;

  factory ItemConta.fromJson(Map<String, dynamic> json) {
    return ItemConta(
      descricao: json['descricao']?.toString() ?? 'Item',
      quantidade: lerNumero(json['quantidade']),
      precoTotal: lerNumero(json['precototal']),
      pago: lerNumero(json['pago']).round() == 1,
      observacao: _texto(json['observacao']),
    );
  }
}

class ContaDetalhe {
  const ContaDetalhe({
    required this.id,
    required this.numero,
    required this.status,
    required this.nomeCliente,
    required this.valorTotal,
    required this.valorRestante,
    required this.itens,
  });

  final String id;
  final int numero;
  final String status;
  final String? nomeCliente;
  final double valorTotal;
  final double valorRestante;
  final List<ItemConta> itens;

  double get aPagar => valorRestante > 0.009 ? valorRestante : 0;

  factory ContaDetalhe.fromJson(Map<String, dynamic> json) {
    final itens = json['itens'];
    return ContaDetalhe(
      id: json['id']?.toString() ?? '',
      numero: lerNumero(json['numero_mesa']).round(),
      status: json['status']?.toString() ?? '',
      nomeCliente: _texto(json['nomecliente']),
      valorTotal: lerNumero(json['valortotal']),
      valorRestante: lerNumero(json['valorrestante']),
      itens: itens is List
          ? itens
              .whereType<Map>()
              .map((item) => ItemConta.fromJson(Map<String, dynamic>.from(item)))
              .toList()
          : const [],
    );
  }
}

class FechamentoPendente {
  const FechamentoPendente({
    required this.idConta,
    required this.numero,
    required this.valor,
    required this.funcao,
    required this.nsu,
    this.autorizacao,
    this.bandeira,
    this.viaCliente,
  });

  final String idConta;
  final int numero;
  final double valor;
  final String funcao;
  final String nsu;
  final String? autorizacao;
  final String? bandeira;
  final String? viaCliente;

  Map<String, dynamic> toJson() {
    return {
      'idConta': idConta,
      'numero': numero,
      'valor': valor,
      'funcao': funcao,
      'nsu': nsu,
      'autorizacao': autorizacao,
      'bandeira': bandeira,
      'viaCliente': viaCliente,
    };
  }

  factory FechamentoPendente.fromJson(Map<String, dynamic> json) {
    return FechamentoPendente(
      idConta: json['idConta']?.toString() ?? '',
      numero: lerNumero(json['numero']).round(),
      valor: lerNumero(json['valor']),
      funcao: json['funcao']?.toString() ?? 'credito',
      nsu: json['nsu']?.toString() ?? '',
      autorizacao: _texto(json['autorizacao']),
      bandeira: _texto(json['bandeira']),
      viaCliente: _texto(json['viaCliente']),
    );
  }
}

List<MesaResumo> filtrarContasAbertas(List<MesaResumo> mesas) {
  return mesas.where((mesa) => mesa.ocupadaComSaldo).toList();
}

String? _texto(Object? valor) {
  final texto = valor?.toString().trim() ?? '';
  if (texto.isEmpty) {
    return null;
  }
  return texto;
}
